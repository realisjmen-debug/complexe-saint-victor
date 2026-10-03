# Complexe Scolaire Saint Victor — Gestion scolaire

Starter fonctionnel Next.js + Supabase pour construire le SIGS de l'école.

## Démarrage
1. Installer Node.js 20+.
2. `npm install`
3. Copier `.env.example` vers `.env.local` et renseigner les clés Supabase.
4. `npm run dev`

## Base de données
Le fichier `supabase/schema.sql` contient le socle relationnel et l'activation de RLS. Les politiques d'accès doivent être ajoutées selon les rôles avant mise en production.

## Identité initiale
Complexe Scolaire Saint Victor
Année scolaire initiale dans l'interface : 2026-2027.

## Prochaine étape
Brancher l'authentification Supabase, créer les politiques RLS par permission, puis développer les modules élèves, études, finances, personnel, documents et portails parent/élève.
