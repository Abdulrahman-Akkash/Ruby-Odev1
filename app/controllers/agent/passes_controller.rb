module Agent
  # Otomatik Pas akışı: sistemin kime, neden pas verdiği.
  class PassesController < BaseController
    def index
      @passes = TicketEvent.auto_passes.recent_first.includes(:ticket).limit(100)
      @timeline = TicketEvent.where(kind: %w[sla_warning sla_breached status_changed])
                             .where(actor_id: nil).recent_first.includes(:ticket).limit(30)
    end
  end
end
