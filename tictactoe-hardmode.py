# A Tic-Tac-Toe game
#   ...without mercy
#
# Run tictactoe-hardmode.py

from Tkinter import *
import random, tkMessageBox, sys
from functools import partial

textsize = 16

class TicTacToe(object):

    winners = ({1, 2, 3}, {4, 5, 6}, {7, 8, 9},
                    {1, 4, 7}, {2, 5, 8}, {3, 6, 9},
                    {1, 5, 9}, {3, 5, 7})

    def __init__(self, top):

        self.player = bool(random.randint(0,1))
        self.button_dic = {}   # buttons and StringVar()
        self.top = top
        self.top.geometry("240x240+20+20")
        self.top.wm_attributes('-topmost', True)

        self.X_O_dict = {"X":[], "O":[]}  # moves
        self.top.title('TicTacToe Hard Mode')
        self.top_frame = Frame(self.top, width = 240, height = 240)
        self.top_frame.grid(row = 0, column = 1)
        self.next_player = BooleanVar()
        
        self.buttons()
        
        self.tie = True
        self.moves = 0
        self.next_player.set(self.player)

    def stop(self):
          
        if not self.tie:
            self.draw("gg O" if self.player else "gg X")
        elif self.moves == 9:
            self.draw("Nice." )
        else:
            self.moves = 99
            self.tie = False

        self.next_player.set(self.player)

        self.top.destroy()
        raise SystemExit('Bye.')		

    def play(self):
        while self.moves < 9 and self.tie:
            self.choice()
        try:
            self.stop()
        except TclError:
            pass

    def buttons(self):
        b_row = 1
        b_col = 0
        for j in range(1, 10):
            sv=StringVar()
            sv.set(j)
            b = Button(self.top_frame, textvariable = sv, font = (None, textsize),
                       command = partial(self.cb_handler, j), bg = 'white')
            b.grid(row = b_row, column = b_col, padx = 5, pady = 5)
            self.button_dic[j] = [sv, b]

            b_col += 1
            if b_col > 2:
                b_col = 0
                b_row += 1
				
        Button(self.top, text = 'Accept Defeat', font = ('Arial', textsize * 3/4),
                command = self.stop).grid(row = 2, column = 1, columnspan = 3)

    def cb_handler(self, square_number):
        this_player = "X" if self.player  else "O"

        if self.legal_move(square_number):

            self.button_dic[square_number][0].set(this_player)
            self.X_O_dict[this_player].append(square_number)
            self.button_dic[square_number][1].config(bg = 'red')

            self.check_for_winner(self.X_O_dict[this_player])
            self.player = not self.player
            self.next_player.set(self.player)
        else:
            print "Occupied, pick another", square_number

    def check_for_winner( self, list_in):
        set_in = set(list_in)
        if any(winner.issubset(set_in) for winner in self.winners):
            self.tie = False

    def twocheck(self):
        # check to win first and then to block
        for player in ["X", "O"]:
            this = set(self.X_O_dict[player])
            for sub_set in self.winners:
                if len(this & sub_set) == 2:
                    one_to_return = next(iter(sub_set - this))
                    if self.legal_move(one_to_return):
                        return one_to_return

    def draw(self, msg, title='Instructions'):
        tl=Toplevel()
        tl.geometry("300x300+30+60")
        tl.title(title)
        tl.wm_attributes('-topmost', True)
        lb=Label(tl, text = msg, font = ('Arial', 16))
        lb.pack(fill = 'both', expand = True)
        tl.lift()
        tl.wait_window()

    def choice(self):
        if self.player:
            for but in self.button_dic:
                self.button_dic[but][1].state = DISABLED
            move_to_take = self.twocheck()
            if move_to_take is not None:
                self.cb_handler(move_to_take)
            else:
                for chosen in (5, 1, 3, 7, 9, 2, 4, 6, 8):
                    if self.legal_move(chosen):
                        self.cb_handler(chosen)
                        break
        else:
            for but in self.button_dic:
                self.button_dic[but][1].state = NORMAL
            self.top.wait_variable(self.next_player)
        self.moves += 1		
		
    def legal_move(self, square_number):
        return (square_number not in self.X_O_dict["X"] and
                   square_number not in self.X_O_dict["O"])

game = TicTacToe(Tk())
game.play()
print('Finished')
sys.exit()