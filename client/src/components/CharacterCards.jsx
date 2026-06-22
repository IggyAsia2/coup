const CHARACTERS = [
  {
    name: 'Bá Tước',
    color: '#5e35b1',
    bg: '#1a1028',
    border: '#7e57c2',
    textColor: '#ce93d8',
    emoji: '👑',
    ability: 'Thu thuế +3 đồng',
    block: 'Chặn Viện trợ',
    desc: 'Công tước quyền lực, kiểm soát ngân khố hoàng gia.',
  },
  {
    name: 'Sát Thủ',
    color: '#b71c1c',
    bg: '#1c0a0a',
    border: '#d32f2f',
    textColor: '#ef9a9a',
    emoji: '🗡️',
    ability: 'Ám sát (3 đồng)',
    block: '—',
    desc: 'Sát thủ bí ẩn, loại bỏ mục tiêu với cái giá thấp nhất.',
  },
  {
    name: 'Đại Úy',
    color: '#0277bd',
    bg: '#071828',
    border: '#0288d1',
    textColor: '#81d4fa',
    emoji: '⚓',
    ability: 'Cướp +2 đồng',
    block: 'Chặn Cướp',
    desc: 'Thuyền trưởng biển cả, cướp tài sản kẻ thù.',
  },
  {
    name: 'Đại Sứ',
    color: '#2e7d32',
    bg: '#0a1a0c',
    border: '#388e3c',
    textColor: '#a5d6a7',
    emoji: '🕊️',
    ability: 'Đổi bài',
    block: 'Chặn Cướp',
    desc: 'Nhà ngoại giao khéo léo, luôn có bài mới trong tay áo.',
  },
  {
    name: 'Hầu Tước',
    color: '#ad1457',
    bg: '#1c0810',
    border: '#c2185b',
    textColor: '#f48fb1',
    emoji: '🌹',
    ability: '—',
    block: 'Chặn Ám sát',
    desc: 'Nữ hầu tước quyền quý, miễn nhiễm với ám sát.',
  },
]

export default function CharacterCards() {
  return (
    <div>
      <div className="section-title">5 Nhân vật</div>
      <div className="char-cards-grid">
        {CHARACTERS.map(c => (
          <div
            key={c.name}
            className="char-card"
            style={{ '--card-color': c.color, '--card-bg': c.bg, '--card-border': c.border }}
          >
            <div className="char-card-top">
              <div className="char-card-emoji">{c.emoji}</div>
              <div className="char-card-name" style={{ color: c.textColor }}>{c.name}</div>
            </div>
            <div className="char-card-desc">{c.desc}</div>
            <div className="char-card-abilities">
              {c.ability !== '—' && (
                <div className="char-ability ability">
                  <span className="ability-label">Kỹ năng</span>
                  <span>{c.ability}</span>
                </div>
              )}
              {c.block !== '—' && (
                <div className="char-ability block">
                  <span className="ability-label">Chặn</span>
                  <span>{c.block}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
