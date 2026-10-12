module Agent
  class TicketsController < BaseController
    VIEWS = {
      "mine"       => "Benim taleplerim",
      "unassigned" => "Sahipsiz",
      "at_risk"    => "SLA riski",
      "unsolved"   => "Tüm açık talepler",
      "done"       => "Çözülen / kapanan"
    }.freeze

    before_action :set_ticket, except: :index

    def index
      @view = VIEWS.key?(params[:view]) ? params[:view] : "mine"
      @counts = VIEWS.keys.index_with { |view| scope_for(view).count }
      @tickets = scope_for(@view).includes(:assignee).limit(200)
      @my_risky = Ticket.at_risk.where(assignee: current_user).sla_order.to_a
    end

    def show
      @comments = @ticket.comments.includes(:author)
      @events = @ticket.events.includes(:actor)
      @agents = User.order(:name)
    end

    def take
      @ticket.assign_to!(current_user, actor: current_user)
      redirect_to agent_ticket_path(@ticket), notice: "Talep sana atandı."
    end

    def assign
      agent = User.find(params.require(:assignee_id))
      @ticket.assign_to!(agent, actor: current_user)
      redirect_to agent_ticket_path(@ticket), notice: "Talep #{agent.name} adlı ajana atandı."
    end

    def status
      @ticket.transition_to!(params.require(:status), actor: current_user)
      redirect_to agent_ticket_path(@ticket), notice: "Durum güncellendi."
    rescue Ticket::InvalidTransition => e
      redirect_to agent_ticket_path(@ticket), alert: e.message
    end

    def priority
      new_priority = params.require(:priority)
      if Ticket::PRIORITIES.include?(new_priority)
        @ticket.change_priority!(new_priority, actor: current_user)
        redirect_to agent_ticket_path(@ticket), notice: "Öncelik güncellendi."
      else
        redirect_to agent_ticket_path(@ticket), alert: "Geçersiz öncelik."
      end
    end

    private
      def set_ticket
        @ticket = Ticket.find(params[:id])
      end

      def scope_for(view)
        case view
        when "mine"       then Ticket.unsolved.where(assignee: current_user).sla_order
        when "unassigned" then Ticket.unsolved.unassigned.sla_order
        when "at_risk"    then Ticket.at_risk.sla_order
        when "unsolved"   then Ticket.unsolved.sla_order
        when "done"       then Ticket.where(status: %w[solved closed]).order(updated_at: :desc)
        end
      end
  end
end
