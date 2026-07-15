type WorkerApp = {
  fetch: (
    request: Request,
    env?: unknown,
    executionContext?: ExecutionContext
  ) => Response | Promise<Response>
}

let appPromise: Promise<WorkerApp> | undefined

function loadApp(): Promise<WorkerApp> {
  if (!appPromise) {
    appPromise = import('./app').then((module) => module.default)
  }

  return appPromise
}

export default {
  fetch(
    request: Request,
    env?: unknown,
    executionContext?: ExecutionContext
  ): Promise<Response> {
    return loadApp().then((app) => app.fetch(request, env, executionContext))
  }
}
