import { onRequestPost as __api_bids_js_onRequestPost } from "/Users/choppavarapuhiranmai/Downloads/Fvckrichdad/letthebannercook/functions/api/bids.js"
import { onRequestPost as __api_create_order_js_onRequestPost } from "/Users/choppavarapuhiranmai/Downloads/Fvckrichdad/letthebannercook/functions/api/create-order.js"
import { onRequestGet as __api_slots_js_onRequestGet } from "/Users/choppavarapuhiranmai/Downloads/Fvckrichdad/letthebannercook/functions/api/slots.js"
import { onRequestPost as __api_verify_payment_js_onRequestPost } from "/Users/choppavarapuhiranmai/Downloads/Fvckrichdad/letthebannercook/functions/api/verify-payment.js"
import { onRequestPost as __api_webhook_js_onRequestPost } from "/Users/choppavarapuhiranmai/Downloads/Fvckrichdad/letthebannercook/functions/api/webhook.js"
import { onRequest as __api_get_slots_js_onRequest } from "/Users/choppavarapuhiranmai/Downloads/Fvckrichdad/letthebannercook/functions/api/get-slots.js"

export const routes = [
    {
      routePath: "/api/bids",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_bids_js_onRequestPost],
    },
  {
      routePath: "/api/create-order",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_create_order_js_onRequestPost],
    },
  {
      routePath: "/api/slots",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_slots_js_onRequestGet],
    },
  {
      routePath: "/api/verify-payment",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_verify_payment_js_onRequestPost],
    },
  {
      routePath: "/api/webhook",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_webhook_js_onRequestPost],
    },
  {
      routePath: "/api/get-slots",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_get_slots_js_onRequest],
    },
  ]