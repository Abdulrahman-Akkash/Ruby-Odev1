require "test_helper"

# Aort dilimi uçtan uca: talep gelir → atanır → yanıtlanır → çözülür → 4 gün sonra kapanır.
class AortFlowTest < ActionDispatch::IntegrationTest
  test "müşteri talebi açar, ajan çözer, zaman kuralı kapatır" do
    travel_to T0

    # 1) Müşteri web formundan talep açar
    post requests_path, params: { ticket: { requester_name: "Elif Şahin", requester_email: "elif@example.com",
                                            subject: "Fatura PDF'i açılmıyor", description: "Boş sayfa geliyor", priority: "high" } }
    ticket = Ticket.last
    assert_redirected_to customer_ticket_path(ticket.access_token)
    assert_equal "new", ticket.status
    assert_equal T0 + 4.hours, ticket.first_reply_due_at

    follow_redirect!
    assert_select "h1", "Fatura PDF'i açılmıyor"
    assert_select ".badge", "Yeni"

    # 2) Ajan giriş yapar, vardiyaya başlar, talebi kuyrukta görür ve üstüne alır
    post session_path, params: { email_address: "ayse@example.com", password: "password" }
    assert_redirected_to agent_root_url
    post agent_shift_path, params: { length: "8 saat" }

    get agent_tickets_path(view: "unassigned")
    assert_select "tr##{ActionView::RecordIdentifier.dom_id(ticket)}"

    post take_agent_ticket_path(ticket)
    assert_equal "open", ticket.reload.status
    assert_equal users(:ayse), ticket.assignee

    # 3) 1 saat sonra yanıtlar ve müşteriden bilgi bekler
    travel 1.hour
    post agent_ticket_comments_path(ticket), params: { comment: { body: "Hangi tarayıcıyı kullanıyorsunuz?", submit_as: "pending" } }
    ticket.reload
    assert_equal "pending", ticket.status
    assert_equal :met, ticket.sla_state

    # 4) Müşteri gizli bağlantıdan yanıt verir → talep yeniden açılır
    travel 30.minutes
    post customer_ticket_replies_path(ticket.access_token), params: { comment: { body: "Chrome 141" } }
    assert_equal "open", ticket.reload.status

    # 5) Ajan çözer
    post agent_ticket_comments_path(ticket), params: { comment: { body: "Düzeltildi, tekrar dener misiniz?", submit_as: "solved" } }
    assert_equal "solved", ticket.reload.status
    solved_at = ticket.solved_at

    # 6) 4 gün geçer; ajan paneli açıldığında zaman kuralı talebi kapatır
    travel_to solved_at + 4.days - 1.minute
    post agent_shift_path, params: { length: "8 saat" }
    get agent_root_path
    assert_equal "solved", ticket.reload.status

    travel_to solved_at + 4.days
    get agent_root_path
    assert_equal "closed", ticket.reload.status

    # 7) Müşteri kapanmış talebe yazamaz
    get customer_ticket_path(ticket.access_token)
    assert_select ".badge", "Kapandı"
    assert_select "textarea", false
    post customer_ticket_replies_path(ticket.access_token), params: { comment: { body: "Bir şey daha" } }
    assert_equal "Bu talep kapandı. Lütfen yeni bir talep oluşturun.", flash[:alert]
  ensure
    travel_back
  end

  test "dahili not müşteriye görünmez" do
    ticket = create_ticket
    sign_in_as users(:ayse)
    post agent_ticket_comments_path(ticket), params: { comment: { body: "GİZLİ-NOT", internal: "1" } }
    post agent_ticket_comments_path(ticket), params: { comment: { body: "Herkese açık yanıt" } }

    get customer_ticket_path(ticket.access_token)
    assert_no_match "GİZLİ-NOT", response.body
    assert_match "Herkese açık yanıt", response.body
  end

  test "geçersiz durum geçişi kullanıcıya hata olarak döner" do
    ticket = create_ticket
    sign_in_as users(:ayse)

    patch status_agent_ticket_path(ticket), params: { status: "closed" }

    assert_redirected_to agent_ticket_path(ticket)
    assert_equal "Yeni → Kapandı geçişi yapılamaz", flash[:alert]
    assert_equal "new", ticket.reload.status
  end

  test "eksik bilgili talep formu hata gösterir" do
    post requests_path, params: { ticket: { requester_name: "", requester_email: "gecersiz", subject: "", description: "" } }

    assert_response :unprocessable_entity
    assert_select ".flash.alert"
  end

  test "ajan paneli giriş ister" do
    get agent_root_path
    assert_redirected_to new_session_path
  end
end
