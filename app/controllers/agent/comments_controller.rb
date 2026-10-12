module Agent
  class CommentsController < BaseController
    def create
      ticket = Ticket.find(params[:ticket_id])
      attrs = params.require(:comment).permit(:body, :internal, :submit_as)

      if attrs[:body].blank?
        redirect_to agent_ticket_path(ticket), alert: "Yanıt boş olamaz."
      else
        ticket.reply_as_agent!(current_user, body: attrs[:body],
                                             internal: attrs[:internal] == "1",
                                             submit_as: attrs[:submit_as].presence)
        redirect_to agent_ticket_path(ticket), notice: attrs[:internal] == "1" ? "İç not eklendi." : "Yanıt gönderildi."
      end
    rescue Ticket::InvalidTransition => e
      redirect_to agent_ticket_path(ticket), alert: e.message
    end
  end
end
