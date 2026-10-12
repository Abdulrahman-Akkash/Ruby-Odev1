require "test_helper"

# Zaman kuralları: ilk yanıt SLA'sı ve çözülen talebin otomatik kapanması.
class TicketSlaTest < ActiveSupport::TestCase
  test "ilk yanıt hedefi önceliğe göre hesaplanır" do
    travel_to T0 do
      assert_equal T0 + 1.hour,   create_ticket(priority: "urgent").first_reply_due_at
      assert_equal T0 + 4.hours,  create_ticket(priority: "high").first_reply_due_at
      assert_equal T0 + 8.hours,  create_ticket(priority: "normal").first_reply_due_at
      assert_equal T0 + 24.hours, create_ticket(priority: "low").first_reply_due_at
    end
  end

  test "SLA zamanla on_track -> at_risk -> breached olur" do
    ticket = travel_to(T0) { create_ticket(priority: "normal") } # hedef 17:00, risk 15:00

    travel_to(T0 + 5.hours + 59.minutes) { assert_equal :on_track, ticket.sla_state }
    travel_to(T0 + 6.hours)              { assert_equal :at_risk,  ticket.sla_state }
    travel_to(T0 + 8.hours)              { assert_equal :at_risk,  ticket.sla_state }
    travel_to(T0 + 8.hours + 1.second)   { assert_equal :breached, ticket.sla_state }
  end

  test "hedeften önce verilen ilk yanıt SLA'yı karşılar" do
    ticket = travel_to(T0) { create_ticket(priority: "high") }

    travel_to(T0 + 3.hours) do
      ticket.reply_as_agent!(users(:ayse), body: "Bakıyoruz.")
    end

    travel_to(T0 + 30.days) do
      assert_equal :met, ticket.reload.sla_state
      assert_equal T0 + 3.hours, ticket.first_replied_at
    end
  end

  test "hedeften sonra verilen ilk yanıt ihlal olarak kalır" do
    ticket = travel_to(T0) { create_ticket(priority: "urgent") }

    travel_to(T0 + 61.minutes) { ticket.reply_as_agent!(users(:ayse), body: "Geç kaldık, özür dileriz.") }

    assert_equal :breached, ticket.reload.sla_state
    assert_equal "SLA geç karşılandı", ticket.events.find_by(kind: "first_reply").message
  end

  test "iç not ilk yanıt sayılmaz" do
    ticket = travel_to(T0) { create_ticket }
    travel_to(T0 + 1.hour) { ticket.reply_as_agent!(users(:ayse), body: "Ekibe sordum", internal: true) }

    assert_nil ticket.reload.first_replied_at
  end

  test "öncelik yükseltilince hedef oluşturulma anına göre yeniden hesaplanır" do
    ticket = travel_to(T0) { create_ticket(priority: "low") }

    travel_to(T0 + 30.minutes) { ticket.change_priority!("urgent") }

    assert_equal T0 + 1.hour, ticket.reload.first_reply_due_at
    assert_equal T0 + 45.minutes, ticket.first_reply_risk_at
  end

  test "SLA hatırlatması risk bölgesine girildiği dakikada bir kez düşer" do
    ticket = travel_to(T0) { create_ticket(priority: "normal") }

    travel_to(T0 + 5.hours + 59.minutes) { assert_empty Ticket.notify_sla_risks! }
    travel_to(T0 + 6.hours) { assert_equal [ ticket ], Ticket.notify_sla_risks! }
    travel_to(T0 + 6.hours + 1.minute) { assert_empty Ticket.notify_sla_risks! }

    assert_equal 1, ticket.events.where(kind: "sla_warning").count
    assert_equal T0 + 6.hours, ticket.reload.risk_notified_at
  end

  test "SLA ihlali hedef geçince bir kez kaydedilir" do
    ticket = travel_to(T0) { create_ticket(priority: "urgent") }

    travel_to(T0 + 1.hour) { assert_empty Ticket.notify_sla_breaches! }
    travel_to(T0 + 1.hour + 1.minute) { assert_equal [ ticket ], Ticket.notify_sla_breaches! }
    travel_to(T0 + 2.hours) { assert_empty Ticket.notify_sla_breaches! }
  end

  test "çözülen talep 4 gün sonra otomatik kapanır" do
    ticket = travel_to(T0) { create_ticket }
    travel_to(T0 + 1.hour) { ticket.reply_as_agent!(users(:ayse), body: "Çözüldü", submit_as: "solved") }
    assert_equal "solved", ticket.reload.status

    travel_to(T0 + 1.hour + 4.days - 1.minute) do
      assert_empty Ticket.close_stale_solved!
      assert_equal "solved", ticket.reload.status
    end

    travel_to(T0 + 1.hour + 4.days) do
      assert_equal [ ticket ], Ticket.close_stale_solved!
      assert_equal "closed", ticket.reload.status
      assert_equal T0 + 1.hour + 4.days, ticket.closed_at
    end
  end

  test "müşteri yanıtıyla yeniden açılan talebin kapanış sayacı sıfırlanır" do
    ticket = travel_to(T0) { create_ticket }
    travel_to(T0 + 1.hour) { ticket.reply_as_agent!(users(:ayse), body: "Çözüldü", submit_as: "solved") }
    travel_to(T0 + 3.days) { ticket.reply_as_customer!(body: "Hâlâ olmuyor") }

    travel_to(T0 + 10.days) do
      assert_empty Ticket.close_stale_solved!
      assert_equal "open", ticket.reload.status
      assert_nil ticket.solved_at
    end
  end
end
