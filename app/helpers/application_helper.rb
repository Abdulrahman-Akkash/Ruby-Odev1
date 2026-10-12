module ApplicationHelper
  # Asist logosu: bir oyuncudan diğerine giden kavisli pas.
  def asist_logo(size: 32)
    tag.svg(width: size, height: size, viewBox: "0 0 64 64", role: "img", "aria-label": "Asist logosu", class: "logo-mark") do
      safe_join([
        tag.rect(x: 0, y: 0, width: 64, height: 64, rx: 16, fill: "#0f766e"),
        tag.path(d: "M16 44 C 20 18, 44 14, 48 22", fill: "none", stroke: "#ccfbf1", "stroke-width": 4, "stroke-linecap": "round", "stroke-dasharray": "1 7"),
        tag.path(d: "M42 16 L50 22 L41 27", fill: "none", stroke: "#ccfbf1", "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round"),
        tag.circle(cx: 16, cy: 46, r: 6, fill: "#fbbf24"),
        tag.circle(cx: 48, cy: 42, r: 6, fill: "#ffffff")
      ])
    end
  end

  def fmt_time(time)
    time&.in_time_zone&.strftime("%d.%m.%Y %H:%M")
  end

  def status_badge(status)
    tag.span(Ticket::STATUS_LABELS.fetch(status), class: "badge status-#{status}")
  end

  def priority_badge(priority)
    tag.span(Ticket::PRIORITY_LABELS.fetch(priority), class: "badge priority-#{priority}")
  end

  def sla_badge(ticket, now = Time.current)
    state = ticket.sla_state(now)
    remaining = ticket.sla_remaining(now)
    text = case state
    when :met      then "SLA karşılandı"
    when :breached then ticket.first_replied_at ? "SLA geç karşılandı" : "SLA aşıldı +#{HumanDuration.short(remaining)}"
    when :at_risk  then "Riskli: #{HumanDuration.short(remaining)} kaldı"
    when :on_track then "#{HumanDuration.short(remaining)} kaldı"
    else "—"
    end
    tag.span(text, class: "badge sla-#{state}", title: "İlk yanıt hedefi: #{fmt_time(ticket.first_reply_due_at)}")
  end

  def shift_label(user, now = Time.current)
    if user.on_shift?(now)
      "Vardiyada · bitiş #{user.on_shift_until.strftime('%H:%M')}"
    else
      "Vardiya dışı"
    end
  end
end
