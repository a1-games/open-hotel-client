import Vue from 'vue'
import Canvas from '../components/pixi/pixi.vue'
import { Container, Sprite, Graphics } from 'pixi.js'
import { Loader } from '../../engine/loader'
import { ImagerModule } from '../../game/imager/imager.module'

export default Vue.extend({
  extends: Canvas,
  $injets: {
    module: ImagerModule,
    inject: {
      loader: Loader,
    },
  },
  props: {
    type: {
      type: String,
      required: true,
    },
    value: {
      type: String,
    },
    geometry: {
      type: String,
      default: 'vertical',
    },
    gender: {
      type: String,
      default: 'M',
    },
    hiddenlayers: {
      type: Array,
      default: () => ['bd', 'lh', 'rh'],
    },
    colors: {
      type: Array,
      default: () => [],
    },
    buttonColor: {
      type: Number,
      default: 0xffffff,
    },
  },
  watch: {
    type() {
      this.generate()
    },
    colors() {
      this.generate()
    },
    value() {
      this.generate()
    },
    gender() {
      this.generate()
    },
  },
  mounted() {
    this.generate()
  },
  methods: {
    getGeometry(parttype) {
      for (const t in this.loader.resources.geometry.json.type[this.geometry]) {
        const item = this.loader.resources.geometry.json.type[this.geometry][t]
        if (!('items' in item) || !(parttype in item.items)) continue
        return item
      }
    },
    getLibrary(type, id) {
      const {
        json: { libs, parts },
      } = this.loader.resources.figuremap
      const index = parts[type][id]
      return index !== undefined ? libs[index].id : null
    },
    getColor(paletteid, color) {
      const {
        json: { palette },
      } = this.loader.resources.figuredata
      const colors = palette[paletteid]
      const item = colors[color] || colors[Object.keys(colors)[0]]
      return Number(`0x${item.color}`)
    },
    async generate() {
      const { figuredata } = this.loader.resources
      const { settype } = figuredata.json
      const { set, paletteid, hiddenlayers = [] } = settype[this.type]
      const genders = new Set([this.gender, 'U'])
      const hidden = new Set(hiddenlayers.concat(this.hiddenlayers))
      const geometry = this.geometryType
      const width = 50
      const height = 50
      const margin = 4
      const border = 4
      const qtPerLine = Math.floor(this.app.view.width / (width + margin * 2))

      const typesAlias = {
        hrb: 'hr',
      }

      let i = 0

      this.app.stage.removeChildren(0, 1)
      const items = new Container()
      this.app.stage.addChild(items)

      for (const id in set) {
        const item = set[id]
        if (!genders.has(item.gender) || item.selectable != 1) continue
        const { parts } = item
        const libs = parts.reduce((acc, part) => {
          const lib = this.getLibrary(part.type, part.id)
          if (!lib) return acc
          acc[lib] = `${lib}/${lib}.json`
          return acc
        }, {})

        const group = new Container()
        const img = new Sprite()

        group.sortableChildren = true
        ;(async () => {
          await this.loader.add(libs).wait()

          for (const part of parts) {
            if (hidden.has(part.type)) continue
            const lib = this.getLibrary(typesAlias[part.type] || part.type, part.id)
            if (!lib) continue
            const {
              spritesheet: { textures },
              manifest: { assets },
            } = this.loader.resources[lib]
            const assetIds = [
              `h_std_${part.type}_${part.id}_2_0`,
              `h_std_${part.type}_${part.id}_1_0`,
              `h_std_${part.type}_${part.id}_0_0`,
              `h_std_${part.type}_${part.id}_3_0`,
              `h_sml_${part.type}_${part.id}_2_0`,
              `h_spk_${part.type}_${part.id}_2_0`,
              `h_spk_${part.type}_${part.id}_1_0`,
              `h_spk_${part.type}_${part.id}_0_0`,
              `h_lay_${part.type}_${part.id}_2_0`,
              `h_std_${part.type}_${part.id}_7_0`,
            ]
            const assetId = assetIds.find(id => `${lib}_${id}.png` in textures)
            const offsetId = assetIds.find(id => id in assets)

            if (!assetId) continue
            const textureId = `${lib}_${assetId}.png`
            const texture = textures[textureId]
            const sprite = new Sprite(texture)
            const [x, y] = (assets[offsetId].offset || '').split(',').map(v => Number(v))

            if (part.colorable == 1 && part.type !== 'ey') {
              const color = this.colors[part.colorindex - 1]
              sprite.tint = this.getColor(paletteid, color)
            }

            sprite.pivot.set(x, y)
            sprite.position.set(0, 0)

            const geometry = this.getGeometry(part.type)

            if (geometry) {
              sprite.zIndex = geometry.items[part.type].radius
            }

            group.addChild(sprite)
          }

          img.texture = this.app.renderer.generateTexture(group, 1, 1)

          img.position.set(centerX, centerY)
          img.pivot.set(Math.ceil(img.width / 2), Math.ceil(img.height / 2))
        })()

        const g = new Graphics()
        const button = new Container()
        const centerX = width / 2
        const centerY = height / 2

        if (id == this.value) g.lineStyle(border, 0xffffff, 1, 0)
        g.beginFill(this.buttonColor, 0.25)
        g.drawCircle(centerX, centerY, (width + height) / 2 / 2)

        button.addChild(g, img)

        button.interactive = true
        button.cursor = 'pointer'

        button.position.x = border + (width + margin + border) * (i % qtPerLine)
        button.position.y = border + (height + margin + border) * Math.floor(i / qtPerLine)

        items.addChild(button)

        button
          .addListener('pointertap', () => this.$emit('input', id))
          .addListener('pointerover', () => {
            g.clear()

            if (id == this.value) {
              g.lineStyle(border, 0xffffff, 1, 0)
            } else {
              g.lineStyle(border, 0xffffff, 0.75, 0)
            }
            g.beginFill(this.buttonColor, 0.25)
            g.drawCircle(centerX, centerY, (width + height) / 2 / 2)
          })
          .addListener('pointerout', () => {
            g.clear()

            if (id == this.value) g.lineStyle(border, 0xffffff, 1, 0)
            g.beginFill(this.buttonColor, 0.25)
            g.drawCircle(centerX, centerY, (width + height) / 2 / 2)
          })

        i++
      }

      this.$nextTick(() => {
        this.app.renderer.resize(this.app.view.width, items.height + margin * 2)
      })
    },
  },
})
