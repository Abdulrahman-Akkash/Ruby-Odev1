# Canlı sunum için demo verisi. db/seeds.rb ve "Demo verisini sıfırla" düğmesi kullanır.
# Zamanlar "şimdi"ye göre geriye kaydırılır ki SLA durumları çeşitli görünsün.
module Demo
  PASSWORD = "asist2026".freeze

  AGENTS = [
    { name: "Ayşe Yılmaz",  email_address: "ayse@asist.dev",   shift: 8.hours },
    { name: "Mehmet Kaya",  email_address: "mehmet@asist.dev", shift: 8.hours },
    { name: "Zeynep Demir", email_address: "zeynep@asist.dev", shift: nil }
  ].freeze

  module_function

  def seed_if_empty!
    reset! unless User.exists?
  end

  def reset!(now: Time.current)
    ActiveRecord::Base.transaction do
      TicketEvent.delete_all
      Comment.delete_all
      Ticket.delete_all
      Session.delete_all
      User.delete_all

      ayse, mehmet, zeynep = AGENTS.map do |attrs|
        User.create!(name: attrs[:name], email_address: attrs[:email_address], password: PASSWORD,
                     on_shift_until: attrs[:shift] && now + attrs[:shift])
      end

      ticket(now, 25.minutes, "Fatura PDF'i açılmıyor", "normal",
             "Ekim faturamı indirmeye çalıştığımda PDF boş sayfa olarak açılıyor.",
             "Elif Şahin", "elif@ornek-musteri.com")

      ticket(now, 50.minutes, "Ödeme sayfası 500 hatası veriyor", "urgent",
             "Kartla ödeme adımında 'Internal Server Error' alıyoruz, satış duruyor!",
             "Can Öztürk", "can@magaza-ornek.com")

      ticket(now, 3.hours + 10.minutes, "Mobil uygulama açılışta çöküyor", "high",
             "Android 15'te uygulama logodan sonra kapanıyor.",
             "Deniz Arslan", "deniz@ornek-musteri.com", assignee: ayse)

      ticket(now, 2.hours, "Şifre sıfırlama e-postası gelmiyor", "high",
             "Şifremi sıfırla dedim ama e-posta hiç gelmedi, spam klasörüne de baktım.",
             "Burak Koç", "burak@ornek-musteri.com", assignee: zeynep)

      ticket(now, 9.hours, "Hesabım kilitlendi", "normal",
             "Üç kez yanlış şifre girdim, hesabım kilitlendi. Acil açılması lazım.",
             "Selin Aydın", "selin@ornek-musteri.com", assignee: mehmet)

      pending = ticket(now, 5.hours, "Raporu CSV olarak dışa aktarma", "low",
                       "Aylık raporu CSV olarak alabilir miyim?",
                       "Murat Çelik", "murat@ornek-musteri.com", assignee: ayse)
      reply(pending, ayse, now - 4.hours, "Merhaba Murat Bey, Raporlar > Dışa aktar menüsünden CSV seçebilirsiniz. İşinizi gördü mü?", "pending")

      solved = ticket(now, Ticket::AUTO_CLOSE_AFTER + 3.hours, "API anahtarı nasıl yenilenir?", "normal",
                      "Entegrasyon için API anahtarımızı yenilememiz gerekiyor.",
                      "Ece Yıldız", "ece@yazilim-ornek.com", assignee: mehmet)
      reply(solved, mehmet, now - Ticket::AUTO_CLOSE_AFTER + 2.minutes, "Ayarlar > API > Yenile adımlarıyla anahtarınızı yenileyebilirsiniz. Talebi çözüldü olarak işaretliyorum.", "solved")
    end
  end

  def ticket(now, age, subject, priority, description, name, email, assignee: nil)
    created = now - age
    t = Ticket.create!(subject:, priority:, description:, requester_name: name, requester_email: email, created_at: created, updated_at: created)
    t.events.update_all(created_at: created, updated_at: created)
    backdate(t, created + 2.minutes) { t.assign_to!(assignee, actor: assignee) } if assignee
    t
  end

  def reply(ticket, agent, at, body, submit_as)
    backdate(ticket, at) { ticket.reply_as_agent!(agent, body:, submit_as:, now: at) }
  end

  # Blok içinde oluşan yorum ve olayları verilen ana taşır.
  def backdate(ticket, at)
    event_ids = ticket.events.ids
    comment_ids = ticket.comments.ids
    yield
    ticket.events.where.not(id: event_ids).update_all(created_at: at, updated_at: at)
    ticket.comments.where.not(id: comment_ids).update_all(created_at: at, updated_at: at)
  end
end
