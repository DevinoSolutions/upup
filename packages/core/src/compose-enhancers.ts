import type { CoreOptions } from './core'

export type CoreEnhancer = (options: CoreOptions) => CoreOptions

/**
 * Composes multiple CoreOptions enhancers into a single enhancer.
 * Enhancers are applied left-to-right: the output of each is passed
 * as input to the next.
 *
 * @example
 * const withDefaults = composeEnhancers(
 *   withAutoRetry({ maxRetries: 3 }),
 *   withCompression({ quality: 0.8 }),
 * )
 * const core = new UpupCore(withDefaults(userOptions))
 */
export function composeEnhancers(...enhancers: CoreEnhancer[]): CoreEnhancer {
  if (enhancers.length === 0) {
    return (options) => options
  }

  return (options: CoreOptions) =>
    enhancers.reduce((opts, enhancer) => enhancer(opts), options)
}
