require "test_helper"

# Kullanıcı acısının çözümü: vardiyada olmayan ajanın talepleri ve
# SLA'sı riske giren sahipsiz talepler otomatik olarak pas edilir.
class AutoPassTest < ActiveSupport::TestCase
  setup do
    @ayse, @mehmet, @zeynep = users(:ayse), users(:mehmet), users(:zeynep)
  end

  test "vardiyası biten ajanın açık talepleri vardiyadaki ajana geçer" do
    travel_to T0
    @ayse.start_shift!(8.hours)    # 17:00'ye kadar
    @mehmet.start_shift!(12.hours) # 21:00'e kadar
    ticket = create_ticket(priority: "low", assignee: @ayse, status: "open")

    travel_to(T0 + 8.hours - 1.minute) { assert_empty AutoPass.run }
    assert_equal @ayse, ticket.reload.assignee

    travel_to(T0 + 8.hours) { assert_equal [ ticket ], AutoPass.run }
    assert_equal @mehmet, ticket.reload.assignee
    assert_match "Ayşe Yılmaz vardiyada değil", ticket.events.find_by(kind: "auto_pass").message
  ensure
    travel_back
  end

  test "beklemedeki talep sahibinde kalır" do
    travel_to T0
    @mehmet.start_shift!(8.hours)
    ticket = create_ticket(assignee: @ayse, status: "pending")

    assert_empty AutoPass.run
    assert_equal @ayse, ticket.reload.assignee
  ensure
    travel_back
  end

  test "sahipsiz talep SLA risk bölgesine girdiği an pas edilir" do
    travel_to T0
    @mehmet.start_shift!(8.hours)
    ticket = create_ticket(priority: "urgent") # hedef 10:00, risk 09:45

    travel_to(T0 + 44.minutes) { assert_empty AutoPass.run }
    assert_nil ticket.reload.assignee

    travel_to(T0 + 45.minutes) { assert_equal [ ticket ], AutoPass.run }
    assert_equal @mehmet, ticket.reload.assignee
    assert_equal "open", ticket.status
  ensure
    travel_back
  end

  test "en az yüklü ajana pas verilir" do
    travel_to T0
    @ayse.start_shift!(8.hours)
    @mehmet.start_shift!(8.hours)
    2.times { create_ticket(assignee: @ayse, status: "open") }
    create_ticket(assignee: @mehmet, status: "open")
    orphan = create_ticket(assignee: @zeynep, status: "open") # Zeynep vardiya dışı

    AutoPass.run

    assert_equal @mehmet, orphan.reload.assignee
  ensure
    travel_back
  end

  test "birden fazla talep yük dengesiyle dağıtılır" do
    travel_to T0
    @ayse.start_shift!(8.hours)
    @mehmet.start_shift!(8.hours)
    orphans = 4.times.map { create_ticket(assignee: @zeynep, status: "open") }

    AutoPass.run

    assert_equal [ 2, 2 ], orphans.map { |t| t.reload.assignee }.tally.values.sort
  ensure
    travel_back
  end

  test "vardiyada kimse yoksa talep yerinde kalır, ilk gelen ajana geçer" do
    travel_to T0
    ticket = create_ticket(assignee: @zeynep, status: "open")

    assert_empty AutoPass.run
    assert_equal @zeynep, ticket.reload.assignee

    @ayse.start_shift!(4.hours)
    assert_equal [ ticket ], AutoPass.run
    assert_equal @ayse, ticket.reload.assignee
  ensure
    travel_back
  end

  test "vardiya dışındaki ajanın talebine müşteri yazınca anında pas edilir" do
    travel_to T0
    @ayse.start_shift!(1.hour)
    @mehmet.start_shift!(8.hours)
    ticket = create_ticket(assignee: @ayse)
    ticket.reply_as_agent!(@ayse, body: "Bilgi bekliyorum", submit_as: "pending")

    travel_to(T0 + 3.hours) { ticket.reply_as_customer!(body: "Bilgiler ekte") }

    ticket.reload
    assert_equal "open", ticket.status
    assert_equal @mehmet, ticket.assignee
  ensure
    travel_back
  end

  test "vardiyayı bitirip tarama çalışınca talepler hemen devredilir" do
    travel_to T0
    @ayse.start_shift!(8.hours)
    @mehmet.start_shift!(8.hours)
    ticket = create_ticket(assignee: @ayse, status: "open")

    travel_to(T0 + 2.hours) do
      @ayse.end_shift!
      result = Sweeper.run
      assert_equal [ ticket ], result.passes
    end
    assert_equal @mehmet, ticket.reload.assignee
  ensure
    travel_back
  end
end
