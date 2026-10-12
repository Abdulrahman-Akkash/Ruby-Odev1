require "test_helper"

# Kullanıcı acısı uçtan uca: ajan vardiyayı bitirir, talepleri arkadaşına pas edilir.
class AutoPassFlowTest < ActionDispatch::IntegrationTest
  test "vardiyayı bitiren ajanın talepleri pas akışında görünür" do
    travel_to T0
    users(:mehmet).start_shift!(8.hours)
    ayse = users(:ayse)
    ayse.start_shift!(8.hours)
    ticket = create_ticket(subject: "Mobil uygulama çöküyor", assignee: ayse, status: "open")

    sign_in_as ayse
    delete agent_shift_path

    assert_redirected_to agent_passes_path
    assert_match "1 talebin", flash[:notice]
    assert_equal users(:mehmet), ticket.reload.assignee

    follow_redirect!
    assert_select ".event-auto_pass", text: /Mobil uygulama çöküyor/
    assert_select ".event-auto_pass", text: /Mehmet Kaya \(Ayşe Yılmaz vardiyada değil\)/
  ensure
    travel_back
  end

  test "2 dakikalık demo vardiyası bitince talepler kendiliğinden pas edilir" do
    travel_to T0
    users(:mehmet).start_shift!(8.hours)
    ayse = users(:ayse)
    ticket = create_ticket(assignee: ayse, status: "open")

    sign_in_as ayse
    post agent_shift_path, params: { length: "2 dakika (demo)" }
    assert_equal T0 + 2.minutes, ayse.reload.on_shift_until

    travel 1.minute
    get agent_root_path
    assert_equal ayse, ticket.reload.assignee

    travel 1.minute
    get agent_root_path
    assert_equal users(:mehmet), ticket.reload.assignee
  ensure
    travel_back
  end

  test "SLA hatırlatma bandı ajanın riskli taleplerini listeler" do
    travel_to T0
    ayse = users(:ayse)
    ayse.start_shift!(8.hours)
    ticket = create_ticket(priority: "urgent", assignee: ayse, status: "open")

    sign_in_as ayse
    travel 50.minutes
    get agent_root_path

    assert_select ".flash.warn", text: /##{ticket.id} \(10 dk kaldı\)/
  ensure
    travel_back
  end
end
