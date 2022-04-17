## Sūrya's Description Report

### Files Description Table


|  File Name  |  SHA-1 Hash  |
|-------------|--------------|
| contracts/Vesting.sol | 8921fd5e5b64d3079b9decad2f60d6d01a729cdd |


### Contracts Description Table


|  Contract  |         Type        |       Bases      |                  |                 |
|:----------:|:-------------------:|:----------------:|:----------------:|:---------------:|
|     └      |  **Function Name**  |  **Visibility**  |  **Mutability**  |  **Modifiers**  |
||||||
| **Types** | Library |  |||
||||||
| **Vesting** | Implementation | Context, ReentrancyGuard |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | getStream | External ❗️ |   | validStream |
| └ | deltaOf | Public ❗️ |   | validStream |
| └ | balanceOf | Public ❗️ |   | validStream |
| └ | createStream | Public ❗️ | 🛑  | nonReentrant |
| └ | withdrawFromStream | External ❗️ | 🛑  | nonReentrant validStream |
| └ | cancelStream | External ❗️ | 🛑  | nonReentrant validStream |


### Legend

|  Symbol  |  Meaning  |
|:--------:|-----------|
|    🛑    | Function can modify state |
|    💵    | Function is payable |
