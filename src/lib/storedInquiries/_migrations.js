import { clearSelection } from '@/lib/chartHelper'

export default {
  _migrate(installedVersion, inquiries) {
    if (installedVersion < 2) {
      inquiries.forEach(inquiry => {
        inquiry.viewType = 'chart'
        inquiry.viewOptions = inquiry.chart
        delete inquiry.chart
      })
    }

    if (installedVersion < 3) {
      inquiries.forEach(inquiry => {
        if (inquiry.viewType === 'graph') {
          inquiry.viewOptions.style.nodes.color.opacity = 100
          inquiry.viewOptions.style.highlightMode = 'node_and_neighbors'
        }
      })
    }

    if (installedVersion < 4) {
      inquiries.forEach(inquiry => {
        if (
          inquiry.viewType === 'graph' &&
          inquiry.viewOptions.layout.type === 'forceAtlas2'
        ) {
          inquiry.viewOptions.layout.options.initialAlgorithm = 'circular'
        }
      })
    }

    if (installedVersion < 5) {
      inquiries.forEach(inquiry => {
        if (inquiry.viewType === 'chart') {
          clearSelection(inquiry.viewOptions.data, inquiry.viewOptions.layout)
        }
      })
    }

    return inquiries
  }
}
