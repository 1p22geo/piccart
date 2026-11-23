#!/usr/bin/env bash
# Piccart API smoke test — run against a FRESH dev server (rm -rf .data && npm run dev)
set -e
BASE=${BASE:-http://localhost:3000}
SHOPPER=/tmp/piccart-shopper.txt
ADMIN=/tmp/piccart-admin.txt

echo "== 1. register shopper (201 expected)"
curl -s -o /dev/null -w '%{http_code}\n' -c "$SHOPPER" -H 'Content-Type: application/json' \
  -d '{"email":"smoke@example.com","username":"smoke","password":"Smoke-Test-1"}' \
  "$BASE/api/auth/register"

echo "== 2. me (echoes the shopper)"
curl -s -b "$SHOPPER" "$BASE/api/auth/me"; echo

echo "== 3. admin login — paste the bootstrap password from the server console"
read -r -p "admin password: " ADMIN_PW
curl -s -o /dev/null -c "$ADMIN" -H 'Content-Type: application/json' \
  -d "{\"email\":\"admin@piccart.local\",\"password\":\"$ADMIN_PW\"}" \
  "$BASE/api/auth/login"

echo "== 4. admin creates a product (three picsum URLs expected)"
curl -s -b "$ADMIN" -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Widget","description":"curl smoke test","price":"9.99","stock":5}' \
  "$BASE/api/products"; echo

echo "== 5. shopper adds 2 to the cart"
curl -s -b "$SHOPPER" -H 'Content-Type: application/json' \
  -d '{"productId":1,"qty":2}' "$BASE/api/cart/items"; echo

echo "== 6. place the order (snapshot prices, total 1998 expected)"
curl -s -b "$SHOPPER" -H 'Content-Type: application/json' \
  -d '{"fullName":"Smoke Test","addressLine1":"1 Test Way","addressLine2":"","city":"Warszawa","postalCode":"00-001","country":"Polska"}' \
  "$BASE/api/orders"; echo

echo "== 7. shopper orders list"
curl -s -b "$SHOPPER" "$BASE/api/orders"; echo

echo "== 8. product stock must now be 3"
curl -s "$BASE/api/products/1"; echo

echo "== 9. shopper must NOT see the admin endpoint (403 expected)"
curl -s -o /dev/null -w '%{http_code}\n' -b "$SHOPPER" -H 'Content-Type: application/json' \
  -d '{"name":"Nope","price":"1.00","stock":1}' "$BASE/api/products"
