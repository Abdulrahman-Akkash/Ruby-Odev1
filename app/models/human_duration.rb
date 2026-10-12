# Saniye cinsinden süreyi "2 sa 05 dk" gibi kısa Türkçe metne çevirir.
module HumanDuration
  module_function

  def short(seconds)
    seconds = seconds.to_i.abs
    return "1 dk'dan az" if seconds < 60

    days, rest = seconds.divmod(86_400)
    hours, rest = rest.divmod(3_600)
    minutes = rest / 60

    if days.positive?
      hours.positive? ? "#{days} gün #{hours} sa" : "#{days} gün"
    elsif hours.positive?
      minutes.zero? ? "#{hours} sa" : format("%d sa %02d dk", hours, minutes)
    else
      "#{minutes} dk"
    end
  end
end
