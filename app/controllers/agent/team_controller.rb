module Agent
  class TeamController < BaseController
    def index
      @agents = User.order(:name)
      @load = Ticket.active.group(:assignee_id).count
      @pending = Ticket.where(status: "pending").group(:assignee_id).count
      @risky = Ticket.at_risk.group(:assignee_id).count
    end
  end
end
