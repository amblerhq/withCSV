# V3 Technical Debt

## 1. ~~Flow control par exceptions → refactor vers des signaux explicites~~ ✅
- traverse.ts est un async generator, terminators utilisent for-await-of
- filter/uniq retournent SKIP (Symbol) au lieu de throw
- Plus de code mort, plus de FlowControlSignal

## 2. ~~Hash de déduplication 32 bits → collisions garanties sur gros volumes~~ ✅
- Objets hashés via crypto.createHash('md5') (128 bits)
- Clés triées pour sérialisation JSON déterministe
- Primitives gardent le toString (correct, pas de collision)

## 3. ~~deepEqual incorrect sur arrays, dates, et types spéciaux~~ ✅
- Arrays vs objets plats distingués
- Dates comparées via getTime()
- Scope limité aux types courants (pas de Map/Set/RegExp)

## 4. ~~Streams jamais fermés sur early return~~ ✅
- Résolu structurellement par le refactor generators (point 1)
- break/return dans for-await-of → generator.return() → stream fermé

## 5. ~~Pas de backpressure sur toJSONFile / toCSVFile~~ ✅
- toJSONFile vérifie write() et await drain quand le buffer est plein

## 6. ~~toCSVFile : l'ordre des colonnes dépend de l'ordre d'insertion des clés~~ ✅
- Ordre figé sur la première row via columnOrder
- Rows suivantes extraites dans le même ordre

## 7. ~~key() filtre les falsy au lieu de filtrer undefined~~ ✅
- Corrigé : `keyValue === undefined` au lieu de `!keyValue`

## 8. ~~columns() retourne undefined silencieusement pour les colonnes absentes~~ ✅
- Type retour : Record<Column, string | undefined>

## 9. ~~Test runner : compatibilité zsh/globstar~~ ✅
- Remplacé le glob bash par find -name '*.test.ts' -exec

## 10. Target ES2018/CJS → envisager dual ESM/CJS
- Pas bloquant mais à considérer pour le tree-shaking et l'écosystème moderne
