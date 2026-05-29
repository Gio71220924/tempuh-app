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


def from_openap(oap_code, our_id, short, category, subtype,
                name_override=None, payload_override=None,
                range_override=None, pax_override=None, alt_override=None):
    ac = openap.prop.aircraft(oap_code)
    alt_m  = ac['cruise']['height']
    alt_ft = alt_m * 3.28084
    mach   = ac['cruise']['mach']
    tas_kt = mach * speed_of_sound(alt_m) * 1.94384

    try:
        ff = FuelFlow(oap_code)
    except Exception:
        ff = FuelFlow(oap_code, use_synonym=True)

    mass      = ac['mtow'] * 0.70
    fuel_t_hr = round(ff.enroute(mass=mass, tas=tas_kt, alt=alt_ft) * 3.6, 2)
    range_nm  = range_override or round(ac['cruise']['range'] / 1.852)
    payload_t = payload_override or round((ac['mlw'] - ac['oew']) / 1000, 1)
    fl        = alt_override or f"FL{int(alt_ft / 100)}"

    return {
        'id':         our_id,
        'name':       name_override or ac['aircraft'],
        'short':      short,
        'category':   category,
        'subtype':    subtype,
        'maxPax':     pax_override or ac.get('pax', {}).get('max', 0),
        'maxPayload': payload_t,
        'oew':        round(ac['oew'] / 1000, 1),
        'maxFuel':    round(ac['mfc'] * 0.80 / 1000, 1),  # mfc is in liters; ×0.80 kg/L
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
        'maxPax': 287, 'maxPayload': 46.0, 'oew': 130.8, 'maxFuel': 111.3,
        'mtow': 251.0, 'fuelBurn': 5.2, 'cruise': 472, 'alt': 'FL370', 'maxRange': 7200,
    },
    {
        'id': 'a35k', 'name': 'Airbus A350-1000', 'short': 'A351',
        'category': 'Commercial', 'subtype': 'widebody',
        'maxPax': 369, 'maxPayload': 69.0, 'oew': 155.0, 'maxFuel': 127.0,
        'mtow': 316.0, 'fuelBurn': 7.1, 'cruise': 488, 'alt': 'FL390', 'maxRange': 8700,
    },
    {
        'id': 'b77x', 'name': 'Boeing 777X-9', 'short': 'B777X',
        'category': 'Commercial', 'subtype': 'widebody',
        'maxPax': 426, 'maxPayload': 70.0, 'oew': 167.8, 'maxFuel': 158.0,
        'mtow': 352.0, 'fuelBurn': 7.0, 'cruise': 490, 'alt': 'FL380', 'maxRange': 7285,
    },
    {
        'id': 'bcs3', 'name': 'Airbus A220-300', 'short': 'A220',
        'category': 'Commercial', 'subtype': 'narrowbody',
        'maxPax': 130, 'maxPayload': 15.0, 'oew': 35.6, 'maxFuel': 17.4,
        'mtow': 70.9, 'fuelBurn': 2.1, 'cruise': 447, 'alt': 'FL410', 'maxRange': 3400,
    },
    # Private jets — not in OpenAP
    {
        'id': 'gl75', 'name': 'Bombardier Global 7500', 'short': 'G7500',
        'category': 'Private', 'subtype': 'ultra long',
        'maxPax': 19, 'maxPayload': 2.5, 'oew': 25.2, 'maxFuel': 22.3,
        'mtow': 51.0, 'fuelBurn': 1.8, 'cruise': 516, 'alt': 'FL430', 'maxRange': 7700,
    },
    {
        'id': 'g700', 'name': 'Gulfstream G700', 'short': 'G700',
        'category': 'Private', 'subtype': 'ultra long',
        'maxPax': 19, 'maxPayload': 2.9, 'oew': 22.0, 'maxFuel': 19.3,
        'mtow': 48.0, 'fuelBurn': 1.8, 'cruise': 516, 'alt': 'FL410', 'maxRange': 7500,
    },
    {
        'id': 'fa8x', 'name': 'Dassault Falcon 8X', 'short': 'F8X',
        'category': 'Private', 'subtype': 'long range',
        'maxPax': 16, 'maxPayload': 2.0, 'oew': 14.5, 'maxFuel': 14.7,
        'mtow': 33.0, 'fuelBurn': 1.4, 'cruise': 460, 'alt': 'FL410', 'maxRange': 6450,
    },
    {
        'id': 'citx', 'name': 'Cessna Citation X+', 'short': 'CIT-X',
        'category': 'Private', 'subtype': 'midsize',
        'maxPax': 12, 'maxPayload': 1.0, 'oew': 9.3, 'maxFuel': 6.3,
        'mtow': 16.8, 'fuelBurn': 1.5, 'cruise': 528, 'alt': 'FL450', 'maxRange': 3460,
    },
    {
        'id': 'pc24', 'name': 'Pilatus PC-24', 'short': 'PC24',
        'category': 'Private', 'subtype': 'light jet',
        'maxPax': 11, 'maxPayload': 1.1, 'oew': 4.6, 'maxFuel': 2.6,
        'mtow': 8.3, 'fuelBurn': 0.7, 'cruise': 425, 'alt': 'FL450', 'maxRange': 2000,
    },
]

# OpenAP-sourced entries. OpenAP's pax.max is the exit-limit (e.g. 550 for the
# 777), not a real airline layout, and its cruise.range / mlw-oew payload run
# optimistic — so we override pax (typical 2/3-class), maxRange (manufacturer
# published) and maxPayload (realistic structural max) per aircraft.
# Tuple: (oap_code, our_id, short, category, subtype,
#         name_override, payload_override, range_override, pax_override, alt_override)
OPENAP_AIRCRAFT = [
    # Commercial — widebody
    ('b77w', 'b77w', 'B777',   'Commercial', 'widebody',   None,            68.8, 7370, 396, None),
    ('a359', 'a359', 'A350',   'Commercial', 'widebody',   None,            53.3, 8100, 315, None),
    ('b789', 'b789', 'B789',   'Commercial', 'widebody',   None,            52.6, 7565, 296, None),
    ('a388', 'a388', 'A380',   'Commercial', 'superjumbo', None,            84.0, 8000, 525, None),
    ('b788', 'b788', 'B788',   'Commercial', 'widebody',   None,            45.6, 7355, 248, None),
    ('b748', 'b748', 'B748',   'Commercial', 'superjumbo', 'Boeing 747-8I', 76.0, 7730, 410, None),
    # Commercial — narrowbody
    ('a20n', 'a320', 'A320',   'Commercial', 'narrowbody', 'Airbus A320neo',   20.0, 3500, 165, None),
    ('b738', 'b738', 'B738',   'Commercial', 'narrowbody', None,               20.7, 2935, 162, None),
    # a21n uses the A320 drag polar as a synonym in OpenAP
    ('a21n', 'a21n', 'A321XLR', 'Commercial', 'narrowbody', 'Airbus A321XLR',  25.0, 4700, 200, None),
    ('b38m', 'b38m', 'B737M',  'Commercial', 'narrowbody', 'Boeing 737 MAX 8', 20.7, 3550, 178, None),
    # Private
    ('glf6', 'g650', 'G650',   'Private',    'long range', 'Gulfstream G650',   2.8, 7000,  19, 'FL410'),
]


def main():
    catalog = []

    print('Fetching from OpenAP...')
    for args in OPENAP_AIRCRAFT:
        try:
            entry = from_openap(*args)
            catalog.append(entry)
            print(f"  OK {entry['id']:6} {entry['name']}")
        except Exception as e:
            print(f"  ERR {args[1]}: {e}")

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
