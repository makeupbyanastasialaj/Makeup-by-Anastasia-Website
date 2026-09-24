// Registers every HTTP function with the Azure Functions runtime.
// Each module is loaded in isolation so that if one file fails to load,
// it can't stop the others from registering their endpoints (which would
// otherwise take the whole admin area down while /api/public kept working).
const modules = [
  "./functions/public",
  "./functions/auth",
  "./functions/adminBookings",
  "./functions/adminCatalog",
  "./functions/adminAvailability",
  "./functions/adminSettings",
];

for (const mod of modules) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require(mod);
  } catch (err) {
    console.error(`[startup] Failed to load function module "${mod}":`, err);
  }
}
