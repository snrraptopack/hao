// Global augmentation for Auwla meta loader context.
// Plugins can extend this interface to add typed properties to the loader context.
//
// Example:
// declare global {
//   interface AuwlaMetaContext {
//     $api: typeof apiClient
//   }
// }
declare global {
  interface AuwlaMetaContext {}
}

export {}