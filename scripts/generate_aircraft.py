"""
Generate public/aircraft.json from OpenAP data + manual fallback for private jets.
Run from repo root: python scripts/generate_aircraft.py
"""
import json
import math
import os
import openap
from openap import FuelFlow


def speed_of_sound(alt_m):
    T = max(216.65, 288.15 - 0.0065 * alt_m)
    return math.sqrt(1.4 * 287 * T)


def from_openap(oap_code, our_id, short, category, subtype, name_override=None):
    ac = openap.prop.aircraft(oap_code)
    alt_m  = ac['cruise']['height']
    alt_ft = alt_m * 3.28084
    mach   = ac['cruise']['mach']
    tas_kt = mach * speed_of_sound(alt_m) * 1.94384

    try:
        ff = FuelFlow(oap_code)
    except Exception:
        ff = FuelFlow(oap_code, use_synonym=True)

    mass       = ac['mtow'] * 0.70
    fuel_t_hr  = round(ff.enroute(mass=mass, tas=tas_kt, alt=alt_ft) * 3.6, 2)
    range_nm   = round(ac['cruise']['range'] / 1.852)
    payload_t  = round((ac['mlw'] - ac['oew']) / 1000, 1)
    fl         = f"FL{int(alt_ft / 100)}"

    return {
        'id':         our_id,
        'name':       name_override or ac['aircraft'],
        'short':      short,
        'category':   category,
        'subtype':    subtype,
        'maxPax':     ac.get('pax', {}).get('max', 0),
        'maxPayload': payload_t,
        'mtow':       round(ac['mtow'] / 1000, 1),
        'fuelBurn':   fuel_t_hr,
        'cruise':     round(tas_kt),
        'alt':        fl,
        'maxRange':   range_nm,
    }


# Manual entries for aircraft not in OpenAP
MANUAL = [
    # Commercial — not in OpenAP
    {
        'id': 'a339', 'name': 'Airbus A330-900neo', 'short': 'A330',
        'category': 'Commercial', 'subtype': 'widebody',
        'maxPax': 440, 'maxPayload': 45.0, 'mtow': 251.0,
        'fuelBurn': 5.2, 'cruise': 472, 'alt': 'FL370', 'maxRange': 7200,
    },
    {
        'id': 'a35k', 'name': 'Airbus A350-1000', 'short': 'A351',
        'category': 'Commercial', 'subtype': 'widebody',
        'maxPax': 480, 'maxPayload': 60.0, 'mtow': 316.0,
        'fuelBurn': 7.1, 'cruise': 488, 'alt': 'FL390', 'maxRange': 8700,
    },
    {
        'id': 'b77x', 'name': 'Boeing 777X-9', 'short': 'B777X',
        'category': 'Commercial', 'subtype': 'widebody',
        'maxPax': 426, 'maxPayload': 74.0, 'mtow': 352.0,
        'fuelBurn': 7.0, 'cruise': 490, 'alt': 'FL380', 'maxRange': 7295,
    },
    {
        'id': 'bcs3', 'name': 'Airbus A220-300', 'short': 'A220',
        'category': 'Commercial', 'subtype': 'narrowbody',
        'maxPax': 160, 'maxPayload': 15.0, 'mtow': 70.9,
        'fuelBurn': 2.1, 'cruise': 447, 'alt': 'FL410', 'maxRange': 3400,
    },
    # Private jets — not in OpenAP
    {
        'id': 'gl75', 'name': 'Bombardier Global 7500', 'short': 'G7500',
        'category': 'Private', 'subtype': 'ultra long',
        'maxPax': 19, 'maxPayload': 2.5, 'mtow': 51.0,
        'fuelBurn': 1.8, 'cruise': 516, 'alt': 'FL430', 'maxRange': 7700,
    },
    {
        'id': 'g700', 'name': 'Gulfstream G700', 'short': 'G700',
        'category': 'Private', 'subtype': 'ultra long',
        'maxPax': 19, 'maxPayload': 2.9, 'mtow': 48.0,
        'fuelBurn': 1.8, 'cruise': 516, 'alt': 'FL410', 'maxRange': 7500,
    },
    {
        'id': 'fa8x', 'name': 'Dassault Falcon 8X', 'short': 'F8X',
        'category': 'Private', 'subtype': 'long range',
        'maxPax': 16, 'maxPayload': 2.0, 'mtow': 33.0,
        'fuelBurn': 1.4, 'cruise': 460, 'alt': 'FL410', 'maxRange': 6450,
    },
    {
        'id': 'citx', 'name': 'Cessna Citation X+', 'short': 'CIT-X',
        'category': 'Private', 'subtype': 'midsize',
        'maxPax': 12, 'maxPayload': 1.0, 'mtow': 16.8,
        'fuelBurn': 1.5, 'cruise': 528, 'alt': 'FL450', 'maxRange': 3460,
    },
    {
        'id': 'pc24', 'name': 'Pilatus PC-24', 'short': 'PC24',
        'category': 'Private', 'subtype': 'light jet',
        'maxPax': 11, 'maxPayload': 1.1, 'mtow': 8.3,
        'fuelBurn': 0.7, 'cruise': 425, 'alt': 'FL450', 'maxRange': 2000,
    },
]

# OpenAP-sourced entries: (oap_code, our_id, short, category, subtype, name_override)
OPENAP_AIRCRAFT = [
    # Commercial — widebody
    ('b77w', 'b77w', 'B777',   'Commercial', 'widebody',   None),
    ('a359', 'a359', 'A350',   'Commercial', 'widebody',   None),
    ('b789', 'b789', 'B789',   'Commercial', 'widebody',   None),
    ('a388', 'a388', 'A380',   'Commercial', 'superjumbo', None),
    ('b788', 'b788', 'B788',   'Commercial', 'widebody',   None),
    ('b748', 'b748', 'B748',   'Commercial', 'superjumbo', 'Boeing 747-8I'),
    # Commercial — narrowbody
    ('a20n', 'a320', 'A320',   'Commercial', 'narrowbody', 'Airbus A320neo'),
    ('b738', 'b738', 'B738',   'Commercial', 'narrowbody', None),
    ('a21n', 'a21n', 'A321XLR','Commercial', 'narrowbody', 'Airbus A321XLR'),
    ('b38m', 'b38m', 'B737M',  'Commercial', 'narrowbody', 'Boeing 737 MAX 8'),
    # Private
    ('glf6', 'g650', 'G650',   'Private',    'long range', 'Gulfstream G650'),
]


def main():
    catalog = []

    print('Fetching from OpenAP...')
    for args in OPENAP_AIRCRAFT:
        try:
            entry = from_openap(*args)
            catalog.append(entry)
            print(f"  ✓ {entry['id']:6} {entry['name']}")
        except Exception as e:
            print(f"  ✗ {args[1]}: {e}")

    print('Adding manual entries...')
    for entry in MANUAL:
        catalog.append(entry)
        print(f"  + {entry['id']:6} {entry['name']}")

    # Sort: Commercial first (widebody → superjumbo → narrowbody), then Private
    order = {'Commercial': 0, 'Private': 1}
    sub_order = {'widebody': 0, 'superjumbo': 1, 'narrowbody': 2, 'ultra long': 3, 'long range': 4, 'midsize': 5, 'light jet': 6}
    catalog.sort(key=lambda a: (order.get(a['category'], 9), sub_order.get(a['subtype'], 9)))

    out_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'aircraft.json')
    out_path = os.path.normpath(out_path)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)

    print(f'\nWrote {len(catalog)} aircraft to {out_path}')


if __name__ == '__main__':
    main()
