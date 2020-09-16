import { EventEmitter } from 'events'
import { RequestOptions, LoaderResponse } from './adapter.interface'

export interface ILoaderResource {
  name: string
  options?: object
  request: RequestOptions
  response?: LoaderResponse
}

export interface LoaderResourceRequest {
  name: string
  url: string
  options: any
}

export class LoaderResource extends EventEmitter implements ILoaderResource {
  name: string
  request: RequestOptions
  response: LoaderResponse = null
  error: Error = null
  loaded = false
  ready = false
  in_queue = false
  options?: LoaderResourceRequest['options']

  constructor(resource: ILoaderResource) {
    super()
    Object.assign(this, resource)
    this.setMaxListeners(Infinity)
  }

  async toPromise() {
    if (this.ready) return this
    if (this.error) throw this.error
    return new Promise<LoaderResource>((resolve, reject) => {
      this.once('ready', resolve).once('error', reject)
    })
  }
}
