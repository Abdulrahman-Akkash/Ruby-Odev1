require "test_helper"

class SweeperTest < ActiveSupport::TestCase
  test "tüm zaman kurallarını tek seferde işletir ve tekrar çalıştırınca çoğaltmaz" do
    travel_to T0
    users(:mehmet).start_shift!(12.hours)
    risky = create_ticket(priority: "urgent")
    late = create_ticket(priority: "urgent", assignee: users(:mehmet))
    solved = create_ticket(assignee: users(:mehmet))
    solved.reply_as_agent!(users(:mehmet), body: "Tamam", submit_as: "solved")

    travel_to(T0 + 50.minutes) do
      result = Sweeper.run
      assert_includes result.warnings, risky
      assert_includes result.passes, risky
    end

    travel_to(T0 + 4.days + 1.minute) do
      result = Sweeper.run
      assert_includes result.breaches, late
      assert_includes result.closed, solved

      again = Sweeper.run
      assert_not again.any?
    end
  ensure
    travel_back
  end
end
