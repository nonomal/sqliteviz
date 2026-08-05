import { expect } from 'chai'
import { mount, flushPromises } from '@vue/test-utils'
import actions from '@/store/actions'
import mutations from '@/store/mutations'
import { createStore } from 'vuex'
import MainView from '@/views/MainView.vue'
import { routes } from '@/router'
import { createRouter, createWebHistory } from 'vue-router'

describe('MainView.vue', () => {
  it('Saves inquiry without data', async () => {
    const state = {
      db: {},
      tabs: [],
      inquiries: []
    }
    const store = createStore({ state, actions, mutations })
    const router = createRouter({
      history: createWebHistory(),
      routes: routes
    })

    router.push('/workspace')
    await router.isReady()
    const wrapper = mount(MainView, {
      global: {
        stubs: {
          'router-link': true,
          teleport: false,
          'app-diagnostic-info': true,
          transition: false,
          schema: true,
          'run-result': true
        },
        plugins: [store, router]
      },
      attachTo: document.body
    })

    await wrapper.find('#create-btn').trigger('click')

    store.state.tabs[1].result = {
      columns: ['id', 'name'],
      values: {
        id: [1, 2],
        name: ['Harry', 'Drako']
      }
    }

    await flushPromises()

    // Add trace
    await wrapper
      .findAllComponents({ name: 'Chart' })[1]
      .find('button.js-add-button')
      .wrapperElement.click()

    await flushPromises()

    // Select data for axis x
    await wrapper
      .findAll('.field .dropdown-container .Select__indicator')[0]
      .wrapperElement.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true })
      )
    await wrapper.findAll('.Select__menu .Select__option')[0].trigger('click')

    // Select data for axis y
    await wrapper
      .findAll('.field .dropdown-container .Select__indicator')[2]
      .wrapperElement.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true })
      )
    await wrapper.findAll('.Select__menu .Select__option')[1].trigger('click')

    // Click Save in the top menu
    await wrapper.find('#save-btn').trigger('click')

    // Input inquiry name
    document.querySelector('.dialog input').value = 'test'
    document.querySelector('.dialog input').dispatchEvent(
      new InputEvent('input', {
        data: 'test'
      })
    )

    // Click Save in the dialog
    document
      .querySelector('.dialog .dialog-buttons-container button.primary')
      .click()

    const inquiriesInStore = store.state.inquiries
    expect(inquiriesInStore.length).to.equal(1)
    expect(inquiriesInStore[0].createdAt).to.not.be.null
    expect(inquiriesInStore[0].createdAt).to.not.be.undefined
    expect(inquiriesInStore[0].updateAt).to.not.be.null
    expect(inquiriesInStore[0].updatedAt).to.not.be.undefined

    expect(inquiriesInStore[0].id).to.not.be.null
    expect(inquiriesInStore[0].id).to.not.be.undefined

    expect(inquiriesInStore[0].name).to.equal('test')
    expect(inquiriesInStore[0].viewType).to.equal('chart')
    expect(inquiriesInStore[0].viewOptions.data).to.eql([
      {
        type: 'scatter',
        mode: 'markers',
        x: null,
        xsrc: 'id',
        meta: {
          columnNames: {
            x: 'id',
            y: 'name'
          }
        },
        y: null,
        ysrc: 'name'
      }
    ])
    wrapper.unmount()
  })
})
