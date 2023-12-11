[![alt-text](https://img.shields.io/badge/-Patreon-%23ff424d?style=for-the-badge)](https://www.patreon.com/reyzor1991) 

### PF2e Party Sheet Helper - module for feature for Actor Party

- Roll template (secret if click Meta/Ctrl) (shift for copy check)
- Health Estimate(Label, color)
- Origin/Z-Scatter method for depositing PC Tokens
- Button for create encounter for party
- Buttons for calculate travel speeds
- Influence inline roll

#### Example
```@Check[type:diplomacy|dc:33|traits:action:influence,npc-name:NPC 1]{Make impression on an NPC 1}```

```@Check[type:diplomacy|dc:15|traits:action:chases,npc-name:Sajan]{Sajan scares crowd}```

- action:influence - necessary to trigger skill check
- npc-name:NPC 1 - necessary to write to subsystem npc name

Points of result

    criticalFailure: -1
    failure: 0
    success: 1
    criticalSuccess: 2