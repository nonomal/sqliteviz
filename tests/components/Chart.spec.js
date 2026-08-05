import { expect } from 'chai'
import sinon from 'sinon'
import { mount, flushPromises } from '@vue/test-utils'
import Chart from '@/components/Chart.vue'
import chartHelper from '@/lib/chartHelper'
import * as dereference from 'react-chart-editor/lib/lib/dereference'
import fIo from '@/lib/utils/fileIo'
import { nextTick } from 'vue'

describe('Chart.vue', () => {
  const $store = { state: { isWorkspaceVisible: true } }

  afterEach(() => {
    sinon.restore()
  })

  it('getOptionsForSave called with proper arguments', () => {
    const wrapper = mount(Chart, {
      global: {
        mocks: { $store }
      }
    })
    const vm = wrapper.vm
    const stub = sinon.stub(chartHelper, 'getOptionsForSave').returns('result')
    const chartData = vm.getOptionsForSave()
    expect(stub.calledOnceWith(vm.state, vm.dataSources)).to.equal(true)
    expect(chartData).to.equal('result')
    wrapper.unmount()
  })

  it('emits update when plotly updates', async () => {
    const wrapper = mount(Chart, {
      global: {
        mocks: { $store }
      }
    })
    wrapper.findComponent({ ref: 'plotlyEditor' }).vm.$emit('update')
    expect(wrapper.emitted('update')).to.have.lengthOf(1)
    wrapper.unmount()
  })

  it('calls dereference and updates chart when dataSources is changed', async () => {
    sinon.spy(dereference, 'default')
    const dataSources = {
      name: ['Gryffindor'],
      points: [80]
    }

    const wrapper = mount(Chart, {
      props: {
        dataSources,
        initOptions: {
          data: [
            {
              type: 'bar',
              mode: 'markers',
              x: null,
              xsrc: 'name',
              meta: {
                columnNames: {
                  x: 'name',
                  y: 'points',
                  text: 'points'
                }
              },
              orientation: 'v',
              y: null,
              ysrc: 'points',
              text: null,
              textsrc: 'points'
            }
          ],
          layout: {},
          frames: []
        }
      },
      global: {
        mocks: { $store }
      }
    })
    await flushPromises()

    expect(wrapper.find('svg.main-svg .overplot text').text()).to.equal('80')
    const newDataSources = {
      name: ['Gryffindor'],
      points: [100]
    }

    await wrapper.setProps({ dataSources: newDataSources })
    await flushPromises()
    expect(dereference.default.called).to.equal(true)
    expect(wrapper.find('svg.main-svg .overplot text').text()).to.equal('100')
  })

  it('the plot resizes when the container resizes', async () => {
    const wrapper = mount(Chart, {
      attachTo: document.body,
      props: {
        dataSources: null
      },
      global: {
        mocks: { $store }
      }
    })

    // don't call flushPromises here, otherwize resize observer will be call to often
    // which causes ResizeObserver loop completed with undelivered notifications.
    await nextTick()

    const container =
      wrapper.find('.chart-container').wrapperElement.parentElement
    const plot = wrapper.find('.svg-container').wrapperElement

    const initialContainerWidth = container.scrollWidth
    const initialContainerHeight = container.scrollHeight

    const initialPlotWidth = plot.scrollWidth
    const initialPlotHeight = plot.scrollHeight

    const newContainerWidth = initialContainerWidth * 2 || 1000
    const newContainerHeight = initialContainerHeight * 2 || 2000

    container.style.width = `${newContainerWidth}px`
    container.style.height = `${newContainerHeight}px`

    await flushPromises()

    expect(plot.scrollWidth).not.to.equal(initialPlotWidth)
    expect(plot.scrollHeight).not.to.equal(initialPlotHeight)

    container.style.width = 'unset'
    container.style.height = 'unset'
    wrapper.unmount()
  })

  it("doesn't calls dereference when dataSources is null", async () => {
    sinon.stub(dereference, 'default')
    const dataSources = {
      id: [1],
      name: ['foo']
    }

    // mount the component
    const wrapper = mount(Chart, {
      props: { dataSources },
      global: {
        mocks: { $store }
      }
    })

    await wrapper.setProps({ dataSources: null })
    expect(dereference.default.calledOnce).to.equal(true)
    wrapper.unmount()
  })

  it('saveAsPng', async () => {
    sinon.spy(fIo, 'downloadFromUrl')
    const dataSources = {
      id: [1],
      name: ['foo']
    }

    const wrapper = mount(Chart, {
      props: { dataSources },
      global: {
        mocks: { $store }
      }
    })
    sinon.spy(wrapper.vm, 'prepareCopy')

    await nextTick() // chart is rendered
    await wrapper.vm.saveAsPng()

    const url = await wrapper.vm.prepareCopy.returnValues[0]
    expect(wrapper.emitted().loadingImageCompleted.length).to.equal(1)
    expect(fIo.downloadFromUrl.calledOnceWith(url, 'chart'))
    wrapper.unmount()
  })

  it('dataSources are passed correctly', async () => {
    const dataSources = {
      name: ['Gryffindor'],
      points: [80]
    }

    const wrapper = mount(Chart, {
      attachTo: document.body,
      props: {
        dataSources,
        showViewSettings: true
      },
      global: {
        mocks: { $store }
      }
    })
    await flushPromises()
    await wrapper.find('button.js-add-button').wrapperElement.click()

    await flushPromises()

    await wrapper
      .find('.field .dropdown-container .Select__indicator')
      .wrapperElement.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true })
      )

    expect(wrapper.find('.Select__menu').text()).to.contain('name' + 'points')
    wrapper.unmount()
  })

  it('hides and shows controls depending on showViewSettings and resizes the plot', async () => {
    const wrapper = mount(Chart, {
      attachTo: document.body,
      props: {
        dataSources: null,
        showViewSettings: false
      },
      global: {
        mocks: { $store }
      }
    })

    // don't call flushPromises here, otherwize resize observer will be call to often
    // which causes ResizeObserver loop completed with undelivered notifications.
    await nextTick()

    const plot = wrapper.find('.svg-container').wrapperElement
    await flushPromises()
    const initialPlotWidth = plot.scrollWidth
    const initialPlotHeight = plot.scrollHeight

    expect(wrapper.find('.plotly_editor .editor_controls').exists()).to.equal(
      false
    )

    await wrapper.setProps({ showViewSettings: true })

    await flushPromises()

    expect(plot.scrollWidth).not.to.equal(initialPlotWidth)
    expect(plot.scrollHeight).to.equal(initialPlotHeight)
    expect(wrapper.find('.plotly_editor .editor_controls').exists()).to.equal(
      true
    )
    wrapper.unmount()
  })

  it('selections are shown in value viewer', async () => {
    const dataSources = {
      name: ['Gryffindor', 'Hufflepuff', 'Ravenclaw', 'Slytherin'],
      points: [100, 90, 95, 80]
    }
    const wrapper = mount(Chart, {
      attachTo: document.body,
      props: {
        dataSources,
        initOptions: {
          data: [
            {
              type: 'scatter',
              mode: 'markers',
              x: ['Gryffindor', 'Hufflepuff', 'Ravenclaw', 'Slytherin'],
              xsrc: 'name',
              meta: {
                columnNames: {
                  x: 'name',
                  y: 'points'
                }
              },
              y: [100, 90, 95, 80],
              ysrc: 'points',
              selectedpoints: [1, 2]
            }
          ],
          layout: {
            autosize: true,
            mapbox: {
              style: 'open-street-map'
            },
            dragmode: 'select',
            selections: [
              {
                xref: 'x',
                yref: 'y',
                line: {
                  width: 1,
                  dash: 'dot'
                },
                type: 'rect',
                x0: 0.6238202370500439,
                y0: 98.1184336198663,
                x1: 2.4324242756804213,
                y1: 87.03915950334289
              }
            ],
            title: {
              subtitle: {
                text: 'Click to enter Plot subtitle'
              }
            },
            xaxis: {
              range: [-0.20324846356453027, 3.20324846356453],
              autorange: true,
              type: 'category'
            },
            yaxis: {
              range: [78.4909264565425, 101.5090735434575],
              autorange: true,
              type: 'linear'
            }
          },
          frames: []
        },
        showViewSettings: true,
        showValueViewer: true
      },
      global: {
        mocks: { $store }
      }
    })

    await flushPromises()
    const valueViewerText = wrapper
      .findComponent({ name: 'ValueViewer' })
      .text()

    expect(valueViewerText).to.contain(`"name": "Hufflepuff"`)
    expect(valueViewerText).to.contain(`"points": 90`)

    expect(valueViewerText).to.contain(`"name": "Ravenclaw"`)
    expect(valueViewerText).to.contain(`"points": 95`)

    expect(valueViewerText).not.to.contain(`"name": "Gryffindor"`)
    expect(valueViewerText).not.to.contain(`"points": 100`)

    expect(valueViewerText).not.to.contain(`"name": "Slytherin"`)
    expect(valueViewerText).not.to.contain(`"points": 80`)
    wrapper.unmount()
  })

  it('clears selections on dataSources change', async () => {
    const dataSources = {
      name: ['Gryffindor', 'Hufflepuff', 'Ravenclaw', 'Slytherin'],
      points: [100, 90, 95, 80]
    }
    const wrapper = mount(Chart, {
      attachTo: document.body,
      props: {
        dataSources,
        initOptions: {
          data: [
            {
              type: 'scatter',
              mode: 'markers',
              x: ['Gryffindor', 'Hufflepuff', 'Ravenclaw', 'Slytherin'],
              xsrc: 'name',
              meta: {
                columnNames: {
                  x: 'name',
                  y: 'points'
                }
              },
              y: [100, 90, 95, 80],
              ysrc: 'points',
              selectedpoints: [1, 2]
            }
          ],
          layout: {
            autosize: true,
            mapbox: {
              style: 'open-street-map'
            },
            dragmode: 'select',
            selections: [
              {
                xref: 'x',
                yref: 'y',
                line: {
                  width: 1,
                  dash: 'dot'
                },
                type: 'rect',
                x0: 0.6238202370500439,
                y0: 98.1184336198663,
                x1: 2.4324242756804213,
                y1: 87.03915950334289
              }
            ],
            title: {
              subtitle: {
                text: 'Click to enter Plot subtitle'
              }
            },
            xaxis: {
              range: [-0.20324846356453027, 3.20324846356453],
              autorange: true,
              type: 'category'
            },
            yaxis: {
              range: [78.4909264565425, 101.5090735434575],
              autorange: true,
              type: 'linear'
            }
          },
          frames: []
        },
        showViewSettings: true,
        showValueViewer: true
      },
      global: {
        mocks: { $store }
      }
    })

    await flushPromises()
    const valueViewerText = wrapper
      .findComponent({ name: 'ValueViewer' })
      .text()

    expect(valueViewerText).to.contain(`"name": "Hufflepuff"`)
    expect(valueViewerText).to.contain(`"name": "Ravenclaw"`)

    await wrapper.setProps({
      dataSources: {
        name: ['Gryffindor', 'Hufflepuff'],
        points: [100, 90]
      }
    })

    await flushPromises()

    expect(wrapper.findComponent({ name: 'ValueViewer' }).text()).equal(
      `No points selected to view`
    )
    wrapper.unmount()
  })

  it('clears selections on changes in chart settings', async () => {
    const dataSources = {
      name: ['Gryffindor', 'Hufflepuff', 'Ravenclaw', 'Slytherin'],
      points: [100, 90, 95, 80]
    }
    const wrapper = mount(Chart, {
      attachTo: document.body,
      props: {
        dataSources,
        initOptions: {
          data: [
            {
              type: 'scatter',
              mode: 'markers',
              x: ['Gryffindor', 'Hufflepuff', 'Ravenclaw', 'Slytherin'],
              xsrc: 'name',
              meta: {
                columnNames: {
                  x: 'name',
                  y: 'points'
                }
              },
              y: [100, 90, 95, 80],
              ysrc: 'points',
              selectedpoints: [1, 2]
            }
          ],
          layout: {
            autosize: true,
            mapbox: {
              style: 'open-street-map'
            },
            dragmode: 'select',
            selections: [
              {
                xref: 'x',
                yref: 'y',
                line: {
                  width: 1,
                  dash: 'dot'
                },
                type: 'rect',
                x0: 0.6238202370500439,
                y0: 98.1184336198663,
                x1: 2.4324242756804213,
                y1: 87.03915950334289
              }
            ],
            title: {
              subtitle: {
                text: 'Click to enter Plot subtitle'
              }
            },
            xaxis: {
              range: [-0.20324846356453027, 3.20324846356453],
              autorange: true,
              type: 'category'
            },
            yaxis: {
              range: [78.4909264565425, 101.5090735434575],
              autorange: true,
              type: 'linear'
            }
          },
          frames: []
        },
        showViewSettings: true,
        showValueViewer: true
      },
      global: {
        mocks: { $store }
      }
    })

    await flushPromises()
    const valueViewerText = wrapper
      .findComponent({ name: 'ValueViewer' })
      .text()

    expect(valueViewerText).to.contain(`"name": "Hufflepuff"`)
    expect(valueViewerText).to.contain(`"name": "Ravenclaw"`)

    // Add another trace
    await wrapper.find('button.js-add-button').wrapperElement.click()

    await flushPromises()

    expect(wrapper.findComponent({ name: 'ValueViewer' }).text()).equal(
      `No points selected to view`
    )
    wrapper.unmount()
  })
})
