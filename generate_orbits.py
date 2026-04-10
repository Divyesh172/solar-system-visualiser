from skyfield.api import load
import json

def generate_orbital_data():
    print("Downloading/Loading JPL Ephemeris data ...")
    ts = load.timescale()

    eph = load('de421.bsp')

    sun = eph['sun']
    planets = {
        'mercury': eph['mercury'],
        'venus': eph['venus'],
        'earth': eph['earth'],
        'saturn': eph['saturn barycenter'],
        'neptune': eph['neptune barycenter'],
        'jupiter': eph['jupiter barycenter'],
        'mars': eph['mars']
    }

    print("Calculating orbital vectors for 2026....")
    days_in_year = range(1,366)
    t_range = ts.utc(2026, 1, days_in_year)

    orbit_data = {}

    for name, body in planets.items():
        position = (body.at(t_range) - sun.at(t_range)).position.au

        points = []

        for i in range(len(position[0])):
            points.append({
                'x': float(position[0][i]),
                'y': float(position[1][i]),
                'z': float(position[2][i])
            })

        orbit_data[name] = points

    print("Exporting data to data.json")
    with open('data.json', 'w') as f:
        json.dump(orbit_data, f, indent=4)

    print("Success! data.json is ready for Three.js")

if __name__ == "__main__":
    generate_orbital_data()
