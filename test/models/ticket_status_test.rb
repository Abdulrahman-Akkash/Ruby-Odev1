require "test_helper"

# Durum akışı: new > open > pending > solved > closed
class TicketStatusTest < ActiveSupport::TestCase
  setup do
    @agent = users(:ayse)
    @ticket = create_ticket
  end

  test "yeni talep 'new' durumunda başlar" do
    assert_equal "new", @ticket.status
    assert_equal "created", @ticket.events.first.kind
  end

  test "izin verilen geçişler" do
    @ticket.transition_to!("open")
    @ticket.transition_to!("pending")
    @ticket.transition_to!("open")
    @ticket.transition_to!("solved")
    @ticket.transition_to!("open")
    @ticket.transition_to!("solved")
    @ticket.transition_to!("closed")

    assert_equal "closed", @ticket.reload.status
    assert_equal %w[open pending open solved open solved closed],
                 @ticket.events.where(kind: "status_changed").map { |e| e.data["to"] }
  end

  test "izin verilmeyen geçişler hata verir" do
    assert_raises(Ticket::InvalidTransition) { @ticket.transition_to!("closed") }

    @ticket.transition_to!("pending")
    assert_raises(Ticket::InvalidTransition) { @ticket.transition_to!("closed") }

    @ticket.transition_to!("solved")
    @ticket.transition_to!("closed")
    assert_raises(Ticket::InvalidTransition) { @ticket.transition_to!("open") }
    assert_equal "closed", @ticket.reload.status
  end

  test "atama yeni talebi açık yapar" do
    @ticket.assign_to!(@agent)

    assert_equal "open", @ticket.reload.status
    assert_equal @agent, @ticket.assignee
  end

  test "ajanın ilk yanıtı talebi ona atar ve açar" do
    @ticket.reply_as_agent!(@agent, body: "Merhaba, inceliyorum.")

    @ticket.reload
    assert_equal "open", @ticket.status
    assert_equal @agent, @ticket.assignee
    assert_not_nil @ticket.first_replied_at
  end

  test "ajan yanıtı 'beklemede' ve 'çözüldü' olarak gönderebilir" do
    @ticket.reply_as_agent!(@agent, body: "Ekran görüntüsü atar mısınız?", submit_as: "pending")
    assert_equal "pending", @ticket.reload.status

    @ticket.reply_as_agent!(@agent, body: "Düzelttik.", submit_as: "solved")
    assert_equal "solved", @ticket.reload.status
    assert_not_nil @ticket.solved_at
  end

  test "geçersiz durumla gönderilen yanıt hiç kaydedilmez" do
    @ticket.transition_to!("pending")

    assert_no_difference -> { Comment.count } do
      assert_raises(Ticket::InvalidTransition) do
        @ticket.reply_as_agent!(@agent, body: "x", submit_as: "closed")
      end
    end
  end

  test "müşteri yanıtı beklemedeki talebi yeniden açar" do
    @ticket.reply_as_agent!(@agent, body: "Bilgi bekliyoruz", submit_as: "pending")
    @ticket.reply_as_customer!(body: "İşte bilgi")

    assert_equal "open", @ticket.reload.status
  end

  test "müşteri yanıtı çözülmüş talebi yeniden açar" do
    @ticket.reply_as_agent!(@agent, body: "Çözüldü", submit_as: "solved")
    @ticket.reply_as_customer!(body: "Olmadı")

    assert_equal "open", @ticket.reload.status
  end

  test "kapanmış talebe ne müşteri ne ajan yanıt yazabilir" do
    @ticket.reply_as_agent!(@agent, body: "Çözüldü", submit_as: "solved")
    @ticket.transition_to!("closed")

    assert_raises(Ticket::InvalidTransition) { @ticket.reply_as_customer!(body: "Merhaba?") }
    assert_raises(Ticket::InvalidTransition) { @ticket.reply_as_agent!(@agent, body: "Merhaba?") }
  end
end
