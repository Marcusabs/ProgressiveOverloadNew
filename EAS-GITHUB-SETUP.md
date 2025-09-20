# EAS GitHub Integration Setup (GRATIS OTA Updates)

Denne guide hjælper dig med at sætte EAS op til at køre **gratis OTA (Over-The-Air) updates** direkte fra GitHub, så du ikke behøver din PC for at opdatere appen.

## 🎯 Hvad du får:

- **GRATIS OTA updates** - ingen PC nødvendig
- **Automatiske builds** kun når nødvendigt (releases)
- **Instant updates** til development/preview
- **Fuldstændig mobil-first workflow**

## 1. Opret EXPO_TOKEN

1. Gå til [Expo Dashboard](https://expo.dev/accounts/marcusabs/projects/progressive-overload-app)
2. Gå til Account Settings → Access Tokens
3. Opret en ny token med navn "GitHub Actions"
4. Kopier token værdien

## 2. Tilføj Secret til GitHub

1. Gå til dit GitHub repository
2. Klik på Settings → Secrets and variables → Actions
3. Klik "New repository secret"
4. Navn: `EXPO_TOKEN`
5. Værdi: Din token fra step 1

## 3. Push til GitHub

```bash
git add .
git commit -m "Add EAS GitHub integration with OTA updates"
git push origin main
```

## 4. Test OTA Update

1. Gå til GitHub repository → Actions tab
2. Du skulle se "EAS Update (OTA)" workflow køre
3. Klik på den for at se update progress

## 🚀 Sådan bruger du det (GRATIS):

### OTA Updates (Instant, gratis):
- **Push til `develop`** → OTA update til development channel
- **Push til `preview`** → OTA update til preview channel  
- **Pull Request** → OTA update til preview channel

### Native Builds (Kun når nødvendigt):
- **Git tag `v1.0.0`** → Production build + submit til stores
- **Manual trigger** → Vælg hvilken build type du vil have

## 📱 Workflow Oversigt:

| Action | Resultat | Kanal | Gratis? |
|--------|----------|-------|---------|
| Push til `develop` | OTA update | development | ✅ Ja |
| Push til `preview` | OTA update | preview | ✅ Ja |
| Pull Request | OTA update | preview | ✅ Ja |
| Git tag `v*` | Native build + submit | production | ⚠️ Kun første gang gratis |
| Manual build | Native build | valgfri | ⚠️ Kun første gang gratis |

## 🔧 EAS Commands (Lokalt):

```bash
# OTA Updates (gratis)
eas update --branch development
eas update --branch preview  
eas update --branch production

# Native Builds (kun når nødvendigt)
eas build --profile development
eas build --profile preview
eas build --profile production

# Check status
eas update:list
eas build:list
```

## 💡 Tips:

1. **Brug OTA updates** for JavaScript/TypeScript ændringer
2. **Brug native builds** kun når du:
   - Tilføjer nye native dependencies
   - Ændrer app.json native konfiguration
   - Vil uploade til App Store/Play Store

3. **Development workflow**:
   ```bash
   # Lav ændringer
   git add .
   git commit -m "Fix bug in workout screen"
   git push origin develop
   # → OTA update sendes automatisk!
   ```

## 🆘 Troubleshooting:

- **OTA update fejler**: Tjek GitHub Actions logs
- **Token fejl**: Verificer EXPO_TOKEN secret
- **Update vises ikke**: Tjek at app kører på rigtig channel
- **Build fejler**: Kun nødvendigt for native ændringer

## 🎉 Resultat:

Nu kan du opdatere din app direkte fra mobilen ved at pushe til GitHub - **helt gratis** og uden PC! 🚀
