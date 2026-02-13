#!/bin/bash

echo "🔧 Arreglando errores de TypeScript..."

# Arreglar CaseStatus en cases.controller.ts
sed -i "s/CaseStatus\.PENDIENTE/'PENDIENTE'/g" src/controllers/cases.controller.ts
sed -i "s/CaseStatus\.EN_PROCESO/'EN_PROCESO'/g" src/controllers/cases.controller.ts
sed -i "s/CaseStatus\.COMPLETADO/'COMPLETADO'/g" src/controllers/cases.controller.ts
sed -i "s/CaseStatus\.RECHAZADO/'RECHAZADO'/g" src/controllers/cases.controller.ts

# Arreglar import de protect en versions.routes.ts
sed -i "s/import { protect }/import { authenticate }/g" src/routes/versions.routes.ts
sed -i "s/router\.use(protect)/router.use(authenticate)/g" src/routes/versions.routes.ts

echo "✅ Errores arreglados!"
