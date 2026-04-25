# RestoSur Mobile (React Native)

Esta versión mobile **no usa WebView**: implementa pantallas nativas en React Native y consume la API del backend.

## Funcionalidad incluida

- Login contra `POST /api/auth/login`
- Persistencia de token en `AsyncStorage`
- Listado de mesas desde `GET /api/tables`
- Logout y recarga manual (pull-to-refresh)

## Requisitos

```bash
npm install --prefix mobile
```

## Desarrollo

1. Levantar backend/API (ejemplo: `npm run dev:api` en la raíz).
2. Iniciar app mobile:

```bash
npm run start --prefix mobile
```

### URL de API

Por defecto:

- Android emulador: `http://10.0.2.2:3000/api`
- iOS: `http://localhost:3000/api`

Podés sobrescribir con variable de entorno:

```bash
EXPO_PUBLIC_API_URL="https://tu-api.com/api" npm run start --prefix mobile
```

## Generar APK con EAS

```bash
npm install -g eas-cli
cd mobile
eas login
eas build --platform android --profile preview
```
