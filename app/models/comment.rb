class Comment < ApplicationRecord
  belongs_to :ticket, inverse_of: :comments, touch: true
  # author nil ise yorum müşteriye aittir.
  belongs_to :author, class_name: "User", optional: true

  validates :body, presence: true

  scope :visible_to_customer, -> { where(internal: false) }

  def from_customer?
    author_id.nil?
  end

  def author_name
    from_customer? ? ticket.requester_name : author.name
  end
end
