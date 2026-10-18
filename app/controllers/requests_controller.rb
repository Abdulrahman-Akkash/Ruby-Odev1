# Müşterinin talep açtığı ve gizli bağlantıyla takip ettiği taraf.
class RequestsController < ApplicationController
  allow_unauthenticated_access
  rate_limit to: 20, within: 10.minutes, only: %i[ create reply ], with: -> { redirect_to root_path, alert: "Çok fazla istek. Biraz sonra tekrar deneyin." }

  # Önce zaman kuralları: müşteri de güncel durumu görsün (ör. süresi dolan çözülmüş talep "Kapandı").
  before_action -> { Sweeper.run }, only: %i[ show reply ]
  before_action :set_ticket, only: %i[ show reply ]

  def new
    @ticket = Ticket.new(priority: "normal")
  end

  def create
    @ticket = Ticket.new(ticket_params)
    if @ticket.save
      redirect_to customer_ticket_path(@ticket.access_token), notice: "Talebiniz alındı. Bu sayfanın bağlantısını saklayın; yanıtlarımızı burada göreceksiniz."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def show
    @comments = @ticket.comments.visible_to_customer.includes(:author)
  end

  def reply
    body = params.require(:comment).permit(:body)[:body]
    if body.blank?
      redirect_to customer_ticket_path(@ticket.access_token), alert: "Mesaj boş olamaz."
    else
      @ticket.reply_as_customer!(body:)
      redirect_to customer_ticket_path(@ticket.access_token), notice: "Yanıtınız iletildi."
    end
  rescue Ticket::InvalidTransition => e
    redirect_to customer_ticket_path(@ticket.access_token), alert: e.message
  end

  private
    def set_ticket
      @ticket = Ticket.find_by!(access_token: params[:token])
    end

    def ticket_params
      params.require(:ticket).permit(:requester_name, :requester_email, :subject, :description, :priority)
    end
end
