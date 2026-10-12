require "test_helper"

class DemoTest < ActiveSupport::TestCase
  test "demo verisi farklı SLA durumlarıyla kurulur" do
    travel_to T0 do
      Demo.reset!

      assert_equal 3, User.count
      states = Ticket.all.map(&:sla_state).tally
      assert states[:on_track].positive?
      assert states[:at_risk].positive?
      assert states[:breached].positive?
      assert states[:met].positive?
      assert_equal T0 + 2.minutes, Ticket.find_by(status: "solved").auto_close_at
    end
  end
end
