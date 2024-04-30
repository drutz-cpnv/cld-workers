"""
Author: Raphael Koeng
Date: 2024-02-02

Description: dans un modèle master-workers, le worker demande du travail au master, fait
             le travail et renvoie le résultat au master

Il se peut qu'il n'y est pas de travail: dans un tel cas le worker attend un peu avant de 
resoumettre une demande. (Si il n'y a pas de travail le end de la tranche est a zero.)

Le master doit avoir au moins 2 URL
GET_JOB_URL = "getwork"
<master ip>/<GET_JOB_URL>/<worker id (hostname)>
<master ip>/<GET_JOB_URL>/<worker id (hostname)>/<le nombre de nombre premier trouve>
"""

import time
import socket
import requests
import random

MASTER_ADDR = "127.0.0.1:5000"  # TODO : utilisez votre ip
GET_JOB_URL = "get-work"
POST_RESULT_URL = "save-result"

__hostname = ""


# Function to check if a number is prime
def is_prime(n):
    """
    Check if a number is prime.

    Args:
        n (int): The number to check.

    Returns:
        bool: True if the number is prime, False otherwise.
    """
    if n < 2:
        return False
    for i in range(2, int(n ** 0.5) + 1):
        if n % i == 0:
            return False
    return True


# Function to calculate prime numbers in a specified range
def calculate_primes_in_range(start, end):
    """
    Calculate prime numbers in a specified range.

    Args:
        start (int): The start of the range.
        end (int): The end of the range.

    Returns:
        list: List of prime numbers in the specified range.
    """
    return [num for num in range(start, end) if is_prime(num)]


def get_next_job():
    try:
        response = requests.get(f'http://{MASTER_ADDR}/{GET_JOB_URL}/{__hostname}')
        response.raise_for_status()  # Raise an exception for bad status codes
        json_data = response.json()  # Parse response as JSON
        print(f"val: {json_data}")
        return json_data
    except requests.exceptions.RequestException as e:
        print("Error:", e)
        return None


def send_result(nbprimes):
    try:
        response = requests.get(f'http://{MASTER_ADDR}/{POST_RESULT_URL}/{__hostname}/{nbprimes}')
        response.raise_for_status()  # Raise an exception for bad status codes
        json_data = response.json()  # Parse response as JSON
        print(f"val: {json_data}")
        return json_data
    except requests.exceptions.RequestException as e:
        print("Error:", e)
        return None


# Main function to execute the code
def main():
    global __hostname

    keep_running = True

    while keep_running:

        job = get_next_job()
        if job is not None and not job["end"] == 0:

            start_time = time.time()

            primes = calculate_primes_in_range(job["start"], job["end"])
            # Flatten the results from different processes
            # primes = [prime for sublist in results for prime in sublist]

            end_time = time.time()
            duration = end_time - start_time

            send_result(len(primes))

            # print(f"Prime numbers: {primes}")
            print(f"Execution time: {duration} seconds and found {len(primes)}")
        else:
            sleep_delay = random.uniform(2, 5)
            time.sleep(sleep_delay)


if __name__ == "__main__":
    try:
        __hostname = socket.gethostname()
        print("Hostname:", __hostname)
        main()
    except Exception as e:
        print("Error:", e)
        print("Failed to get the hostname.")
