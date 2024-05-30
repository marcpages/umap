import { DomUtil, DomEvent } from '../../vendors/leaflet/leaflet-src.esm.js'
import { translate } from './i18n.js'
import { uMapAlert as Alert } from '../components/alerts/alert.js'
import Dialog from './ui/dialog.js'
import { Importer as GeoDataMine } from './importers/geodatamine.js'
import { Importer as Communes } from './importers/communes.js'
import { Importer as Presets } from './importers/presets.js'

export default class Importer {
  constructor(map) {
    this.map = map
    this.TYPES = ['geojson', 'csv', 'gpx', 'kml', 'osm', 'georss', 'umap']
    this.PLUGINS = [new GeoDataMine(map), new Communes(map), new Presets(map)]
    this.dialog = new Dialog(this.map._controlContainer)
  }

  build() {
    this.container = DomUtil.create('div', 'umap-upload')
    this.title = DomUtil.createTitle(
      this.container,
      translate('Import data'),
      'icon-upload'
    )
    this.fileBox = DomUtil.create('div', 'formbox', this.container)
    this.fileInput = DomUtil.element({
      tagName: 'input',
      type: 'file',
      parent: this.fileBox,
      multiple: 'multiple',
      autofocus: true,
    })
    this.urlInput = DomUtil.element({
      tagName: 'input',
      type: 'text',
      parent: this.container,
      placeholder: translate('Provide an URL here'),
    })
    this.rawInput = DomUtil.element({
      tagName: 'textarea',
      parent: this.container,
      placeholder: translate('Paste your data here'),
    })
    DomUtil.element({
      tagName: 'h4',
      parent: this.container,
      textContent: translate('Import from:'),
    })
    const plugins = L.DomUtil.element({
      tagName: 'div',
      className: 'button-bar by4',
      parent: this.container,
    })
    for (const plugin of this.PLUGINS) {
      L.DomUtil.createButton('flat', plugins, plugin.name, () =>
        plugin.open.bind(plugin)(this)
      )
    }
    this.typeLabel = L.DomUtil.add(
      'label',
      '',
      this.container,
      translate('Choose the format of the data to import')
    )
    this.layerLabel = DomUtil.add(
      'label',
      '',
      this.container,
      translate('Choose the layer to import in')
    )
    this.clearLabel = DomUtil.element({
      tagName: 'label',
      parent: this.container,
      textContent: translate('Replace layer content'),
      for: 'datalayer-clear-check',
    })
    this.submitInput = DomUtil.element({
      tagName: 'input',
      type: 'button',
      parent: this.container,
      value: translate('Import'),
      className: 'button',
    })
    this.map.help.button(this.typeLabel, 'importFormats')
    this.typeInput = DomUtil.element({
      tagName: 'select',
      name: 'format',
      parent: this.typeLabel,
    })
    this.layerInput = DomUtil.element({
      tagName: 'select',
      name: 'datalayer',
      parent: this.layerLabel,
    })
    this.clearFlag = DomUtil.element({
      tagName: 'input',
      type: 'checkbox',
      name: 'clear',
      id: 'datalayer-clear-check',
      parent: this.clearLabel,
    })
    DomUtil.element({
      tagName: 'option',
      value: '',
      textContent: translate('Choose the data format'),
      parent: this.typeInput,
    })
    for (const type of this.TYPES) {
      const option = DomUtil.create('option', '', this.typeInput)
      option.value = option.textContent = type
    }
    DomEvent.on(this.submitInput, 'click', this.submit, this)
    DomEvent.on(
      this.fileInput,
      'change',
      (e) => {
        let type = '',
          newType
        for (let i = 0; i < e.target.files.length; i++) {
          newType = U.Utils.detectFileType(e.target.files[i])
          if (!type && newType) type = newType
          if (type && newType !== type) {
            type = ''
            break
          }
        }
        this.typeInput.value = type
      },
      this
    )
  }

  open() {
    if (!this.container) this.build()
    const onLoad = this.map.editPanel.open({ content: this.container })
    onLoad.then(() => {
      this.fileInput.value = null
      this.layerInput.innerHTML = ''
      let option
      this.map.eachDataLayerReverse((datalayer) => {
        if (datalayer.isLoaded() && !datalayer.isRemoteLayer()) {
          const id = L.stamp(datalayer)
          option = DomUtil.add('option', '', this.layerInput, datalayer.options.name)
          option.value = id
        }
      })
      DomUtil.element({
        tagName: 'option',
        value: '',
        textContent: translate('Import in a new layer'),
        parent: this.layerInput,
      })
    })
  }

  openFiles() {
    this.open()
    this.fileInput.showPicker()
  }

  submit() {
    let type = this.typeInput.value
    const layerId = this.layerInput[this.layerInput.selectedIndex].value
    let layer
    if (type === 'umap') {
      this.map.once('postsync', this.map._setDefaultCenter)
    }
    if (layerId) layer = this.map.datalayers[layerId]
    if (layer && this.clearFlag.checked) layer.empty()
    if (this.fileInput.files.length) {
      for (let i = 0, file; (file = this.fileInput.files[i]); i++) {
        this.map.processFileToImport(file, layer, type)
      }
    } else {
      if (!type) {
        return Alert.error(L._('Please choose a format'))
      }
      if (this.rawInput.value && type === 'umap') {
        try {
          this.map.importRaw(this.rawInput.value, type)
        } catch (e) {
          Alert.error(L._('Invalid umap data'))
          console.error(e)
        }
      } else {
        if (!layer) layer = this.map.createDataLayer()
        if (this.rawInput.value) layer.importRaw(this.rawInput.value, type)
        else if (this.urlInput.value) layer.importFromUrl(this.urlInput.value, type)
      }
    }
  }
}
