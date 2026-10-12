import { Controller } from "@hotwired/stimulus"

// Ajan kuyruğunu belirli aralıkla yeniler (Turbo morph ile titremeden).
// Her yenileme sunucuda Sweeper'ı tetikler; SLA ve Otomatik Pas kuralları işler.
export default class extends Controller {
  static values = { interval: { type: Number, default: 30000 } }

  connect() {
    this.timer = setInterval(() => {
      if (document.visibilityState === "visible") Turbo.visit(window.location.href, { action: "replace" })
    }, this.intervalValue)
  }

  disconnect() {
    clearInterval(this.timer)
  }
}
