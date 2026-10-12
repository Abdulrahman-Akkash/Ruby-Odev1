class User < ApplicationRecord
  SHIFT_LENGTHS = {
    "2 dakika (demo)" => 2.minutes,
    "4 saat"          => 4.hours,
    "8 saat"          => 8.hours
  }.freeze

  has_secure_password
  has_many :sessions, dependent: :destroy
  has_many :assigned_tickets, class_name: "Ticket", foreign_key: :assignee_id, inverse_of: :assignee, dependent: :nullify

  normalizes :email_address, with: ->(e) { e.strip.downcase }

  validates :name, presence: true
  validates :email_address, presence: true, uniqueness: true

  scope :on_shift, ->(now = Time.current) { where("on_shift_until > ?", now) }

  def on_shift?(now = Time.current)
    on_shift_until.present? && on_shift_until > now
  end

  def start_shift!(length, now: Time.current)
    update!(on_shift_until: now + length)
  end

  def end_shift!(now: Time.current)
    update!(on_shift_until: now)
  end

  def first_name
    name.split.first
  end
end
