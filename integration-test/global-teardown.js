import fs from 'fs/promises'

export default async (config) => {
  // The 'config' argument here is the value returned by globalSetup.
  const uniqueDataDir = config
  if (uniqueDataDir) {
    console.log(`Global teardown: Cleaning up data directory: ${uniqueDataDir}`)
    try {
      await fs.rm(uniqueDataDir, { recursive: true, force: true })
      console.log(`Successfully removed data directory: ${uniqueDataDir}`)
    } catch (error) {
      console.error(`Failed to remove data directory ${uniqueDataDir}:`, error.message)
    }
  }
  console.log('Global teardown: Tests finished.')
}
