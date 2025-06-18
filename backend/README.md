# Estructura del Backend COVEMS

## Arquitectura Modular

El archivo `server.js` original de 649 líneas ha sido refactorizado en una estructura modular más mantenible:

### 📁 Estructura de directorios

```
backend/
├── config/
│   └── database.js          # Configuración de la base de datos
├── controllers/
│   ├── userController.js    # Lógica de negocio para usuarios
│   ├── solicitudController.js # Lógica de negocio para solicitudes
│   ├── reciboController.js  # Lógica de negocio para recibos y pólizas
│   └── saldoController.js   # Lógica de negocio para saldos
├── middleware/
│   └── cors.js             # Configuración de CORS
├── routes/
│   ├── userRoutes.js       # Rutas de usuarios
│   ├── solicitudRoutes.js  # Rutas de solicitudes
│   ├── reciboRoutes.js     # Rutas de recibos
│   ├── polizaRoutes.js     # Rutas de pólizas
│   └── saldoRoutes.js      # Rutas de saldos
├── utils/                  # Utilidades (futuro)
├── package.json
└── server.js              # Archivo principal (ahora solo 25 líneas)
```

### 🔧 Configuración

- **`config/database.js`**: Centraliza la configuración de PostgreSQL/Neon
- **`middleware/cors.js`**: Maneja la configuración CORS de forma modular

### 🎮 Controladores

Cada controlador maneja la lógica de negocio específica:

- **`userController.js`**: Usuarios, agentes, supervisores
- **`solicitudController.js`**: Solicitudes de seguros
- **`reciboController.js`**: Recibos, pólizas y estado de cuenta
- **`saldoController.js`**: Saldos de usuarios

### 🛣️ Rutas

Las rutas están organizadas por funcionalidad:

- **`/api/users`**: Gestión de usuarios
- **`/api/solicitudes`**: Gestión de solicitudes
- **`/api/recibos`**: Gestión de recibos
- **`/api/polizas`**: Búsqueda de pólizas
- **`/api/saldos`**: Gestión de saldos

### 📈 Beneficios de la refactorización

1. **Mantenibilidad**: Código más fácil de mantener y debuggear
2. **Escalabilidad**: Fácil agregar nuevas funcionalidades
3. **Legibilidad**: Separación clara de responsabilidades
4. **Reutilización**: Controladores pueden ser reutilizados
5. **Testing**: Más fácil escribir pruebas unitarias
6. **Colaboración**: Múltiples desarrolladores pueden trabajar en paralelo

### 🔄 Compatibilidad

Todas las rutas originales se mantienen funcionando para no romper el frontend existente.

### 🚀 Próximos pasos recomendados

1. Agregar validación de datos con middlewares
2. Implementar logging estructurado
3. Agregar tests unitarios y de integración
4. Documentar APIs con Swagger/OpenAPI
5. Implementar manejo centralizado de errores
