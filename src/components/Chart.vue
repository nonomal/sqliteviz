<template>
  <div class="chart-container">
    <div v-show="!dataSources" class="warning data-view-warning">
      There is no data to build a chart. Run your SQL query and make sure the
      result is not empty.
    </div>
    <splitpanes
      :before="{ size: 70, max: 100 }"
      :after="{ size: 30, max: 50, hidden: !showValueViewer }"
      :default="{ before: 70, after: 30 }"
      class="chart"
      :style="{ height: !dataSources ? 'calc(100% - 40px)' : '100%' }"
    >
      <template #left-pane>
        <div ref="chartContainer" :style="{ height: '100%' }">
          <PlotlyEditor
            ref="plotlyEditor"
            :data="state.data"
            :layout="state.layout"
            :frames="state.frames"
            :config="config"
            :dataSources="dataSources"
            :dataSourceOptions="dataSourceOptions"
            :plotly="plotly"
            :useResizeHandler="useResizeHandler"
            :debug="true"
            :advancedTraceTypeSelector="true"
            :hideControls="!showViewSettings"
            @update="update"
            @render="onRender"
          />
        </div>
      </template>
      <template v-if="showValueViewer" #right-pane>
        <value-viewer
          :empty="!selectedItems || selectedItems.length === 0"
          emptyMessage="No points selected to view"
          :value="JSON.stringify(selectedItems)"
          defaultFormat="json"
        />
      </template>
    </splitpanes>
  </div>
</template>

<script>
import { applyPureReactInVue } from 'veaury'
import plotly from 'plotly.js'
import 'react-chart-editor/lib/react-chart-editor.css'
import ReactPlotlyEditorWithPlotRef from '@/lib/ReactPlotlyEditorWithPlotRef.jsx'
import chartHelper from '@/lib/chartHelper'
import * as dereference from 'react-chart-editor/lib/lib/dereference'
import fIo from '@/lib/utils/fileIo'
import events from '@/lib/utils/events'
import Splitpanes from '@/components/Common/Splitpanes'
import ValueViewer from '@/components/ValueViewer.vue'
import { nextTick } from 'vue'

export default {
  name: 'Chart',
  components: {
    PlotlyEditor: applyPureReactInVue(ReactPlotlyEditorWithPlotRef),
    Splitpanes,
    ValueViewer
  },
  props: {
    dataSources: Object,
    initOptions: Object,
    exportToPngEnabled: Boolean,
    exportToSvgEnabled: Boolean,
    forPivot: Boolean,
    showViewSettings: Boolean,
    showValueViewer: Boolean
  },
  emits: [
    'update:exportToSvgEnabled',
    'update:exportToHtmlEnabled',
    'update',
    'loadingImageCompleted'
  ],
  data() {
    return {
      plotly,
      state: this.initOptions
        ? JSON.parse(JSON.stringify(this.initOptions))
        : {
            data: [],
            layout: { autosize: true },
            frames: []
          },
      config: {
        editable: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['toImage']
      },
      resizeObserver: null,
      useResizeHandler: this.$store.state.isWorkspaceVisible,
      selectedItems: null
    }
  },
  computed: {
    dataSourceOptions() {
      return chartHelper.getOptionsFromDataSources(this.dataSources)
    }
  },
  watch: {
    dataSources() {
      // we need to update state.data in order to update the graph
      // https://github.com/plotly/react-chart-editor/issues/948
      if (this.dataSources) {
        chartHelper.clearSelection(this.state.data, this.state.layout)
        dereference.default(this.state.data, this.dataSources)
        this.updatePlotly()
      }
    },
    showViewSettings() {
      this.handleResize()
    }
  },
  created() {
    // https://github.com/plotly/plotly.js/issues/4555
    plotly.setPlotConfig({
      notifyOnLogging: 1
    })
    this.$watch(
      () =>
        this.state &&
        this.state.data &&
        this.state.data
          .map(trace => `${trace.type}${trace.mode ? '-' + trace.mode : ''}`)
          .join(','),
      value => {
        events.send('viz_plotly.render', null, {
          type: value,
          pivot: !!this.forPivot
        })
      },
      { deep: true }
    )
    this.$emit('update:exportToSvgEnabled', true)
    this.$emit('update:exportToHtmlEnabled', true)
  },
  async mounted() {
    this.resizeObserver = new ResizeObserver(this.handleResize)
    this.resizeObserver.observe(this.$refs.chartContainer)
    if (this.dataSources) {
      dereference.default(this.state.data, this.dataSources)
    }
    this.handleResize()
    await nextTick()
    const plotlyDiv =
      this.$refs.plotlyEditor?.$el?.querySelector('.js-plotly-plot')
    plotlyDiv?.on('plotly_selected', selectionEvent => {
      if (selectionEvent) {
        this.selectedItems = this.getSelectedData()
      }
    })
    plotlyDiv?.on('plotly_deselect', () => {
      this.selectedItems = this.getSelectedData()
    })
  },
  activated() {
    this.useResizeHandler = true
  },
  deactivated() {
    this.useResizeHandler = false
  },
  beforeUnmount() {
    this.resizeObserver.unobserve(this.$refs.chartContainer)
  },
  methods: {
    async handleResize() {
      // Call updatePlotly twice because there is a small gap (for scrolling?)
      //  on right and bottom of the plot.
      // After the second call it's good.
      this.updatePlotly()
      this.updatePlotly()
    },
    onRender() {
      // TODO: check changes and enable Save button if needed
    },
    update(data, layout, frames) {
      chartHelper.clearSelection(data, layout)

      this.state = { data, layout, frames }
      this.$emit('update')
    },
    updatePlotly() {
      const plotComponent = this.$refs.plotlyEditor.plotComponentRef.current
      plotComponent.updatePlotly(
        true, // shouldInvokeResizeHandler
        plotComponent.props.onUpdate, // figureCallbackFunction
        false // shouldAttachUpdateEvents
      )
    },
    getOptionsForSave() {
      return chartHelper.getOptionsForSave(this.state, this.dataSources)
    },
    async saveAsPng() {
      const url = await this.prepareCopy()
      this.$emit('loadingImageCompleted')
      fIo.downloadFromUrl(url, 'chart')
    },

    async saveAsSvg() {
      const url = await this.prepareCopy('svg')
      fIo.downloadFromUrl(url, 'chart')
    },

    saveAsHtml() {
      fIo.exportToFile(
        chartHelper.getHtml(this.state),
        'chart.html',
        'text/html'
      )
    },
    prepareCopy(type = 'png') {
      return chartHelper.getImageDataUrl(this.$refs.plotlyEditor.$el, type)
    },
    getSelectedData() {
      return chartHelper.getRowsByIndexFromDataSources(
        this.dataSources,
        chartHelper.getSelectedPointsIndexes(this.state.data)
      )
    }
  }
}
</script>

<style scoped>
.chart-container {
  height: 100%;
}

.chart {
  min-height: 242px;
}

:deep(.editor_controls .sidebar__item:before) {
  width: 0;
}
</style>
