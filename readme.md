# DIAGRAM PLOTTER FOR NOTES

### This program can help you draw diagrams on you laptop during meetings, classes, or just for fun! I made this because i cannot find a good penpad for my budget and i need to make diagrams in my school notes. 


## Walkthrough

1. Draw a diagram or a shape on the canvas shown on tablet
1. Click the 'save to laptop' button 
1. The program will automatically save the diagram to you laptop
1. The diagram will be saved in 'noteimg' folder in the same directory as the main program

## Dependencies

1. Python 3.x
1. Flask 
1. Pillow

## How to run
1. Install dependencies
```
#to install all dependencies at once
pip install -r requirements.txt
```
2. Run the main file on your laptop

```
python backend.py
```

3. Open browser on your laptop and go to localhost server if you want to draw from your laptop. 

### OR

3. Open browser on your tablet / second device and type your wifi-router's IPv4 IP address if you want to draw from your tablet / second device.

1. Type the IP Address in your second device's browser followed by ':5000'. 

example: 192.168.x.x:5000

```bash
ipconfig
```

## OR 

1. Download the .exe file and directly run it on your host device. 

1. Go to localhost server if you want to use a second device.

1. Draw on the executable's canvas if you want to draw from your host device. 

1. Type the IP Address in your second device's browser followed by ':5000'. 

example: 192.168.x.x:5000

## DISCLAIMER
> BOTH DEVICES MUST BE ON THE SAME WIFI NETWORK FOR THIS SCRIPT TO WORK