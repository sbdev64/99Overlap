// client.ts applies pending migrations as soon as it's imported — see the
// comment there. This script exists as an explicit standalone entry point
// (e.g. for CI or a future deployment step) that doesn't require starting
// the whole app.
import './client'

console.log('Migrations applied.')
