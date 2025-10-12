import json
from datetime import datetime

with open('dn.json', 'r') as file:
    data = json.load(file)

# Use map and filter to create the records
records = list(map(lambda stat, period: [stat['ext'], int(stat['count']), int(datetime.strptime(period, '%d-%b-%y').strftime('%Y%m'))], 
                   filter(lambda stat: 'ext' in stat and 'HK' in stat['ext'], [stat for obj in data['object'] for stat in obj['statistic']]), 
                   [obj['period'] for obj in data['object'] for _ in obj['statistic']]))

with open('dn2.json', 'w') as file:
    json.dump(records, file)