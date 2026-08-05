import { expect } from 'chai'
import sinon from 'sinon'
import chartHelper from '@/lib/chartHelper'
import * as dereference from 'react-chart-editor/lib/lib/dereference'

describe('chartHelper.js', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('getOptionsFromDataSources', () => {
    const dataSources = {
      id: [1, 2],
      name: ['foo', 'bar']
    }

    const ds = chartHelper.getOptionsFromDataSources(dataSources)
    expect(ds).to.eql([
      { value: 'id', label: 'id' },
      { value: 'name', label: 'name' }
    ])
  })

  it('getSelectedPointsIndexes returns unique selected point indexes', () => {
    const stateData = [
      { selectedpoints: [1, 2, 3] },
      { selectedpoints: [3, 4] },
      { selectedpoints: [] },
      {}
    ]

    const indexes = chartHelper.getSelectedPointsIndexes(stateData)

    expect(indexes).to.eql([1, 2, 3, 4])
  })

  it('getOptionsForSave', () => {
    const state = {
      data: [
        {
          foo: {},
          bar: {},
          selectedpoints: []
        }
      ],
      layout: { selections: [{}] },
      frames: {}
    }
    const dataSources = {
      id: [1, 2],
      name: ['foo', 'bar']
    }
    const dereferenceArgs = []
    sinon.stub(dereference, 'default').callsFake((data, emptySources) => {
      dereferenceArgs[0] = JSON.stringify(data)
      dereferenceArgs[1] = JSON.stringify(emptySources)
    })
    sinon.spy(JSON, 'parse')

    const ds = chartHelper.getOptionsForSave(state, dataSources)

    expect(dereference.default.calledOnce).to.equal(true)
    expect(dereferenceArgs[0]).to.eql(
      JSON.stringify([
        {
          foo: {},
          bar: {},
          selectedpoints: []
        }
      ])
    )
    expect(dereferenceArgs[1]).to.eql(
      JSON.stringify({
        id: [],
        name: []
      })
    )

    expect(ds).to.equal(JSON.parse.returnValues[0])
    expect(ds.layout.selections).to.eql([])
    expect(ds.data).to.eql([
      {
        foo: {},
        bar: {}
      }
    ])
  })

  it('getImageDataUrl returns dataUrl', async () => {
    const element = document.createElement('div')
    const child = document.createElement('div')
    element.append(child)
    child.classList.add('js-plotly-plot')

    let url = await chartHelper.getImageDataUrl(element, 'png')
    expect(/^data:image\/png/.test(url)).to.equal(true)

    url = await chartHelper.getImageDataUrl(element, 'svg')
    expect(/^data:image\/svg\+xml/.test(url)).to.equal(true)
  })

  it('getChartData returns plotly data and layout from element', async () => {
    const element = document.createElement('div')
    const child = document.createElement('div')
    element.append(child)
    child.classList.add('js-plotly-plot')
    child.data = 'plotly data'
    child.layout = 'plotly layout'

    const chartData = chartHelper.getChartData(element)
    expect(chartData).to.eql({
      data: 'plotly data',
      layout: 'plotly layout'
    })
  })

  it('getHtml returns valid html', async () => {
    const options = {
      data: 'plotly data',
      layout: 'plotly layout'
    }

    const html = chartHelper.getHtml(options)
    const doc = document.createElement('div')
    doc.innerHTML = html

    expect(doc.innerHTML).to.equal(html)
    expect(doc.children).to.have.lengthOf(3)
    expect(doc.children[0].src).to.includes('plotly-latest.js')
    expect(doc.children[1].id).to.have.lengthOf(21)
    expect(doc.children[2].innerHTML).to.includes(doc.children[1].id)
    expect(doc.children[2].innerHTML).to.includes(
      'Plotly.newPlot(el, "plotly data", "plotly layout"'
    )
  })

  it('getRowsByIndexFromDataSources', () => {
    const dataSources = {
      id: [1, 2, 3],
      name: ['Harry', 'Draco', 'Ron'],
      points: [10, null, 7]
    }
    const rows = chartHelper.getRowsByIndexFromDataSources(dataSources, [1, 2])
    expect(rows).to.eql([
      { id: 2, name: 'Draco', points: null },
      { id: 3, name: 'Ron', points: 7 }
    ])
  })

  it('clearSelection', () => {
    const layout = {
      selections: [{}],
      someLayoutField: 1
    }
    const data = [
      { selectedpoints: [], someField: 1 },
      { someField: 2 },
      { selectedpoints: [], someField: 3 }
    ]
    chartHelper.clearSelection(data, layout)
    expect(layout).to.eql({ selections: [], someLayoutField: 1 })
    expect(data).to.eql([{ someField: 1 }, { someField: 2 }, { someField: 3 }])
  })
})
