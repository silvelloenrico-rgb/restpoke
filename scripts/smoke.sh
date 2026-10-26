#!/usr/bin/env bash
# Verifica rapida delle API contro `npm run dev:api`.
# Uso: bash scripts/smoke.sh <email> <password> [base_url]
set -u
EMAIL=$1; PASS=$2; BASE=${3:-http://localhost:8787}
JAR=$(mktemp); FAIL=0
check() { if [ "$2" = "$3" ]; then echo "ok   $1"; else echo "FAIL $1 (atteso $3, ottenuto $2)"; FAIL=1; fi; }
code() { curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -c "$JAR" -H 'Content-Type: application/json' "$@"; }

for _ in $(seq 30); do curl -s -o /dev/null "$BASE/" && break; sleep 1; done

check "dati senza login -> 401"     "$(code "$BASE/api/data")" 401
check "password sbagliata -> 401"   "$(code -X POST -d "{\"email\":\"$EMAIL\",\"password\":\"x\"}" "$BASE/api/login")" 401
check "login -> 200"                "$(code -X POST -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" "$BASE/api/login")" 200
check "me -> 200"                   "$(code "$BASE/api/me")" 200
DATA=$(curl -s -b "$JAR" "$BASE/api/data")
check "data contiene items"         "$(echo "$DATA" | grep -c '"items":\[{')" 1
check "tags restituiti come array"  "$(echo "$DATA" | grep -c '"tags":\["')" 1

ID=$(curl -s -b "$JAR" -H 'Content-Type: application/json' -X POST \
  -d '{"name":"TEST smoke","category":"BOX","tags":["Test"],"cost_enrico":10,"colonna_finta":"x"}' "$BASE/api/items" | sed -E 's/.*"id":"([^"]+)".*/\1/')
check "insert restituisce id"       "$(echo -n "$ID" | wc -c | tr -d ' ')" 36
check "update -> 200"               "$(code -X PATCH -d '{"market_price":99}' "$BASE/api/items/$ID")" 200
ROW=$(curl -s -b "$JAR" "$BASE/api/data" | grep -o "\"id\":\"$ID\"[^}]*")
check "update applicato"            "$(echo "$ROW" | grep -c '"market_price":99')" 1
check "created_by impostato"        "$(echo "$ROW" | grep -c '"created_by":"')" 1
check "delete -> 200"               "$(code -X DELETE "$BASE/api/items/$ID")" 200
check "tabella non ammessa -> 404"  "$(code -X POST -d '{}' "$BASE/api/users")" 404
check "logout -> 200"               "$(code -X POST "$BASE/api/logout")" 200
check "dopo logout -> 401"          "$(code "$BASE/api/data")" 401

rm -f "$JAR"; exit $FAIL
