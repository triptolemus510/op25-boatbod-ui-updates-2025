# op25-boatbod-ui-updates-2025
OP25 Boatbod version web interface updates

This implementation works on what python already sends over with just one small addition to tk_p25.py, which is to send over the talkgruop tags in the trunk_update payload. See line 1672 through 1685 in tk_p25.py.

There is also an addition of config.js in the www-static folder which adds the variables for Smart Colors, Site Names, and Presets.

This is tested with P25 only, so far. 

Right now, main.js is full of commented out code and unused stuff which needs to be cleaned up.

# Instructions

1. replace existing main.js, main.css, index.html in www/www-static
2. add new config.js to www/www-static
3. replace existing tk_p25.py in gr-op25_repeater/apps
4. edit config.js to suit your systems
5. provide feedback!
   
![Screenshot 2025-04-13 at 11 36 30 AM](https://github.com/user-attachments/assets/90ceabfc-8b25-42e7-a200-57253e5402ba)

![Screenshot 2025-04-13 at 12 17 27 PM](https://github.com/user-attachments/assets/03597118-a575-492f-a7d0-29af56b93057)
