class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :name, null: false
      t.string :email_address, null: false
      t.string :password_digest, null: false
      # Vardiya bitiş anı. nil veya geçmişte ise ajan "vardiya dışı" sayılır.
      t.datetime :on_shift_until

      t.timestamps
    end
    add_index :users, :email_address, unique: true
  end
end
