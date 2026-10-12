ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"
require_relative "test_helpers/session_test_helper"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Sunum günü, sabah 09:00 — zaman kuralı testlerinin çıpası.
    T0 = Time.zone.local(2026, 10, 19, 9, 0, 0)

    def create_ticket(priority: "normal", subject: "Ödeme sayfası açılmıyor", **attrs)
      Ticket.create!(subject:, priority:, description: "Ayrıntılar", requester_name: "Elif Şahin",
                     requester_email: "elif@example.com", **attrs)
    end
  end
end
