// Sample roster shaped like a real fetch, so the UI can be used and demoed
// without a bot token. Names mirror the example signup sheet.
export function mockRoster() {
  const m = (id, name, attendance, classes) => ({ id, name, attendance, classes })
  return {
    members: [
      m('1', 'Money', 'yes', ['Support_Luminary', 'Support_Tubadoor']),
      m('2', 'Geckou', 'yes', ['Support_Specter', 'DPS_Amalgam']),
      m('3', 'Salty Clonesticks', 'yes', ['Support_Tubadoor', 'Support_Luminary']),
      m('4', 'Pumpkin', 'yes', ['Power_Reaper', 'Core_Necromancer']),
      m('5', 'Hanako', 'yes', ['Support_Luminary']),
      m('6', 'Lexi', 'yes', ['Support_Evoker', 'DPS_Evoker']),
      m('7', 'Fish', 'yes', ['Support_Luminary', 'Hybrid_FB']),
      m('8', 'Hippy', 'yes', ['Power_Reaper']),
      m('9', 'Justin', 'yes', ['DPS_Evoker', 'DPS_Tempest']),
      m('10', 'Pokenmon', 'yes', ['Support_Luminary', 'Minstrel_FB']),
      m('11', 'Britt', 'yes', ['Support_Druid']),
      m('12', 'Sota', 'yes', ['Support_Tubadoor']),
      m('13', 'Kiiven', 'yes', ['Power_Reaper', 'DPS_Untamed']),
      m('14', 'Heartless', 'yes', ['DPS_Evoker', 'DPS_Tempest', 'Support_Evoker']),
      m('15', 'Dani', 'yes', ['Support_Luminary', 'Support_Harbinger']),
      m('16', 'Night', 'yes', ['Support_Evoker']),
      m('17', 'Rasmun', 'yes', ['Support_Tubadoor', 'DPS_Berserker']),
      m('18', 'Matt', 'yes', ['DSP_Spellbreaker', 'DPS_Dragonhunter']),
      m('19', 'Lubu', 'yes', ['DSP_Spellbreaker']),
      m('20', 'Wobbles', 'maybe', ['Support_Specter', 'StripDPS_Virtuoso']),
      m('21', 'Turnip', 'maybe', ['DPS_Berserker', 'DPS_Dragonhunter', 'Power_Reaper']),
      m('22', 'Ghostpepper', null, ['DPS_Amalgam'])
    ],
    groups: [
      { name: 'Main Support Classes', classes: ['Support_Luminary', 'Support_Tubadoor', 'Hybrid_FB', 'Support_Druid', 'Support_Evoker'] },
      { name: 'Other Support Classes', classes: ['Support_DH', 'Support_Harbinger', 'Support_Specter', 'Minstrel_FB'] },
      { name: 'Main Boonstrip & DPS Classes', classes: ['Power_Reaper', 'DSP_Spellbreaker', 'DPS_Untamed', 'DPS_Berserker', 'DPS_Dragonhunter', 'DPS_Amalgam', 'DPS_Evoker'] },
      { name: 'Other Boonstrip & DPS Classes', classes: ['DPS_Tempest', 'Core_Necromancer', 'StripDPS_Virtuoso'] }
    ],
    unmappedEmojis: [],
    fetchedAt: new Date().toISOString(),
    mock: true
  }
}
